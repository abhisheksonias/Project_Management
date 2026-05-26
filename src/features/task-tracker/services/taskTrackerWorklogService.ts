import { supabase } from '@/integrations/supabase/client';
import { formatHoursToHHMM, parseHours } from '@/shared/utils/formatHours';
import { worklogService } from '@/features/worklogs/services/worklogService';

interface AddTrackedDurationInput {
  userId: string;
  projectId: string;
  taskId: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

const msToDecimalHours = (durationMs: number) => {
  const hours = durationMs / (1000 * 60 * 60);
  return Math.max(0, Math.round(hours * 10000) / 10000);
};

const isUnknownColumnError = (error: unknown) => {
  const message = (error as { message?: string })?.message?.toLowerCase() || '';
  return message.includes('column') && message.includes('does not exist');
};

class TaskTrackerWorklogService {
  private async insertSessionFallback(input: AddTrackedDurationInput, hoursHHMM: string) {
    await worklogService.createWorklog({
      user_id: input.userId,
      project_id: input.projectId,
      task_id: input.taskId,
      hours: hoursHHMM,
      note: 'Tracked via task tracker',
      created_at: input.endedAt,
      added_by: input.userId,
    });
  }

  async addTrackedDuration(input: AddTrackedDurationInput): Promise<void> {
    const addedHoursNum = msToDecimalHours(input.durationMs);
    if (addedHoursNum <= 0) return;
    const addedHoursHHMM = formatHoursToHHMM(addedHoursNum);

    // Keep project/task logs separate; aggregate by same user+project+task.
    const { data: existingRows, error: fetchError } = await supabase
      .from('work_logs')
      .select('id, hours, hours_num')
      .eq('user_id', input.userId)
      .eq('project_id', input.projectId)
      .eq('task_id', input.taskId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    const existing = existingRows?.[0];

    if (existing) {
      const baseHoursNum =
        typeof existing.hours_num === 'number' && !Number.isNaN(existing.hours_num)
          ? Number(existing.hours_num)
          : parseHours(existing.hours);
      const totalHoursNum = Math.max(0, baseHoursNum + addedHoursNum);
      const totalHoursHHMM = formatHoursToHHMM(totalHoursNum);

      const updatePayload: Record<string, unknown> = {
        hours: totalHoursHHMM,
        hours_num: totalHoursNum,
        updated_at: input.endedAt,
        end_time: input.endedAt,
      };

      const { error: updateError } = await supabase
        .from('work_logs')
        .update(updatePayload)
        .eq('id', existing.id);

      if (updateError) {
        if (!isUnknownColumnError(updateError)) {
          // If aggregate update fails (policy/constraint/etc), still preserve session in DB.
          await this.insertSessionFallback(input, addedHoursHHMM);
          return;
        }

        // Fallback for schemas without optional tracker columns.
        const { error: fallbackUpdateError } = await supabase
          .from('work_logs')
          .update({
            hours: totalHoursHHMM,
            hours_num: totalHoursNum,
            updated_at: input.endedAt,
          })
          .eq('id', existing.id);

        if (fallbackUpdateError) {
          await this.insertSessionFallback(input, addedHoursHHMM);
          return;
        }
      }
      return;
    }

    const insertPayload: Record<string, unknown> = {
      user_id: input.userId,
      project_id: input.projectId,
      task_id: input.taskId,
      hours: addedHoursHHMM,
      hours_num: addedHoursNum,
      note: null,
      created_at: input.startedAt,
      updated_at: input.endedAt,
      start_time: input.startedAt,
      end_time: input.endedAt,
      created_by: input.userId,
      added_by: input.userId,
    };

    const { error: insertError } = await supabase.from('work_logs').insert(insertPayload);
    if (!insertError) return;
    if (!isUnknownColumnError(insertError)) {
      await this.insertSessionFallback(input, addedHoursHHMM);
      return;
    }

    // Fallback for schemas without optional tracker columns.
    const fallbackInsertPayload: Record<string, unknown> = {
      user_id: input.userId,
      project_id: input.projectId,
      task_id: input.taskId,
      hours: addedHoursHHMM,
      hours_num: addedHoursNum,
      note: null,
      created_at: input.startedAt,
      updated_at: input.endedAt,
      added_by: input.userId,
    };

    const { error: fallbackInsertError } = await supabase
      .from('work_logs')
      .insert(fallbackInsertPayload);
    if (fallbackInsertError) {
      await this.insertSessionFallback(input, addedHoursHHMM);
    }
  }
}

export const taskTrackerWorklogService = new TaskTrackerWorklogService();
