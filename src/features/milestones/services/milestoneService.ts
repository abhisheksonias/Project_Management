import { supabase } from '@/integrations/supabase/client';
import { parseHours } from '@/shared/utils/formatHours';

export interface Milestone {
  id: string;
  name: string;
  project_id: string;
  amount: number;
  currency: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string | null;
  description: string | null;
  is_hourly: boolean;
  allotted_hours: number | null;
  hourly_rate: number | null;
}

export interface CreateMilestoneData {
  name: string;
  project_id: string;
  amount?: number;
  currency?: string;
  sort_order?: number | null;
  description?: string | null;
  is_hourly?: boolean;
  allotted_hours?: number | null;
  hourly_rate?: number | null;
}

export interface UpdateMilestoneData {
  name?: string;
  amount?: number;
  currency?: string;
  sort_order?: number | null;
  description?: string | null;
  is_hourly?: boolean;
  allotted_hours?: number | null;
  hourly_rate?: number | null;
}

export interface MilestoneHoursSummary {
  milestone_id: string;
  is_hourly: boolean;
  allotted_hours: number | null;
  hourly_rate: number | null;
  logged_hours: number;
  remaining_hours: number | null;
  cost_so_far: number | null;
}

class MilestoneService {
  async getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching milestones:', error);
      throw error;
    }
    return (data as Milestone[]) || [];
  }

  async getAllMilestones(): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all milestones:', error);
      throw error;
    }
    return (data as Milestone[]) || [];
  }

  async getMilestoneById(id: string): Promise<Milestone | null> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching milestone:', error);
      throw error;
    }
    return data as Milestone;
  }

  async createMilestone(milestone: CreateMilestoneData): Promise<Milestone> {
    const isHourly = milestone.is_hourly ?? false;
    const allottedHours = milestone.allotted_hours ?? null;
    const hourlyRate = milestone.hourly_rate ?? null;
    const inferredAmount = isHourly
      ? (allottedHours ?? 0) * (hourlyRate ?? 0)
      : milestone.amount ?? 0;

    const { data, error } = await supabase
      .from('milestones')
      .insert({
        name: milestone.name,
        project_id: milestone.project_id,
        amount: inferredAmount,
        currency: milestone.currency || 'INR',
        sort_order: milestone.sort_order ?? null,
        description: milestone.description ?? null,
        is_hourly: isHourly,
        allotted_hours: allottedHours,
        hourly_rate: hourlyRate,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Milestone;
  }

  async updateMilestone(id: string, updates: UpdateMilestoneData): Promise<Milestone> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.currency !== undefined) updatePayload.currency = updates.currency;
    if (updates.sort_order !== undefined) updatePayload.sort_order = updates.sort_order;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.is_hourly !== undefined) updatePayload.is_hourly = updates.is_hourly;
    if (updates.allotted_hours !== undefined) updatePayload.allotted_hours = updates.allotted_hours;
    if (updates.hourly_rate !== undefined) updatePayload.hourly_rate = updates.hourly_rate;

    const { data, error } = await supabase
      .from('milestones')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Milestone;
  }

  async deleteMilestone(id: string): Promise<void> {
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getMilestonesHoursSummary(milestoneIds: string[]): Promise<Record<string, MilestoneHoursSummary>> {
    if (!milestoneIds || milestoneIds.length === 0) {
      return {};
    }

    const uniqueIds = Array.from(new Set(milestoneIds));

    const { data: milestoneRows, error: milestoneError } = await supabase
      .from('milestones')
      .select('id, is_hourly, allotted_hours, hourly_rate')
      .in('id', uniqueIds);

    if (milestoneError) {
      throw milestoneError;
    }

    const summaryMap = new Map<string, MilestoneHoursSummary>();
    (milestoneRows || []).forEach((row) => {
      summaryMap.set(row.id, {
        milestone_id: row.id,
        is_hourly: row.is_hourly ?? false,
        allotted_hours: row.allotted_hours ?? null,
        hourly_rate: row.hourly_rate ?? null,
        logged_hours: 0,
        remaining_hours: row.allotted_hours ?? null,
        cost_so_far: null,
      });
    });

    if (summaryMap.size === 0) {
      return {};
    }

    const { data: worklogs, error: logsError } = await supabase
      .from('work_logs')
      .select(`
        hours,
        hours_num,
        tasks!inner (
          milestone_id
        )
      `)
      .in('tasks.milestone_id', Array.from(summaryMap.keys()));

    if (logsError) {
      throw logsError;
    }

    (worklogs || []).forEach((log) => {
      const milestoneId = (log as any)?.tasks?.milestone_id;
      if (!milestoneId) return;
      const summary = summaryMap.get(milestoneId);
      if (!summary) return;

      const numericHours =
        typeof log.hours_num === 'number' && !Number.isNaN(log.hours_num)
          ? Number(log.hours_num)
          : parseHours(log.hours);

      summary.logged_hours += numericHours || 0;
    });

    summaryMap.forEach((summary) => {
      if (summary.is_hourly && summary.allotted_hours !== null) {
        summary.remaining_hours = Math.max(summary.allotted_hours - summary.logged_hours, 0);
      } else {
        summary.remaining_hours = null;
      }

      if (summary.is_hourly && summary.hourly_rate !== null) {
        summary.cost_so_far = Number((summary.logged_hours * summary.hourly_rate).toFixed(2));
      } else {
        summary.cost_so_far = null;
      }
    });

    return Object.fromEntries(summaryMap.entries());
  }

  async getMilestoneHoursSummary(milestoneId: string): Promise<MilestoneHoursSummary | null> {
    const summaries = await this.getMilestonesHoursSummary([milestoneId]);
    return summaries[milestoneId] ?? null;
  }
}

export const milestoneService = new MilestoneService();

