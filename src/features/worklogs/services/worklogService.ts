import { supabase } from '@/integrations/supabase/client';

export interface Worklog {
  id: string;
  created_at: string;
  hours: string;
  note: string | null;
  task_id: string | null;
  tasks?: {
    name: string;
    type: string;
    status?: string;
  };
  projects?: {
    name: string;
  };
}

export interface CreateWorklogData {
  hours: string;
  note?: string | null;
  task_id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  added_by: string;
}

export interface UpdateWorklogData {
  hours: string;
  note?: string | null;
  task_id: string;
  created_at?: string;
}

class WorklogService {
  async getUserWorklogs(userId: string, month?: Date): Promise<Worklog[]> {
    let query = supabase
      .from('work_logs')
      .select(`
        id,
        hours,
        note,
        created_at,
        task_id,
        projects(name),
        tasks(name, type, status)
      `)
      .eq('user_id', userId);

    // Apply month filter if provided
    if (month) {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Worklog[];
  }

  async createWorklog(data: CreateWorklogData): Promise<void> {
    const { error } = await supabase
      .from('work_logs')
      .insert({
        hours: data.hours,
        note: data.note,
        task_id: data.task_id,
        project_id: data.project_id,
        user_id: data.user_id,
        created_at: data.created_at,
        added_by: data.added_by,
      });

    if (error) throw error;
  }

  async updateWorklog(id: string, data: UpdateWorklogData): Promise<void> {
    const updatePayload: {
      hours: string;
      note?: string | null;
      task_id: string;
      created_at?: string;
    } = {
      hours: data.hours,
      note: data.note,
      task_id: data.task_id,
    };

    if (data.created_at) {
      updatePayload.created_at = data.created_at;
    }

    const { error } = await supabase
      .from('work_logs')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteWorklog(id: string): Promise<void> {
    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async deleteMultipleWorklogs(ids: string[]): Promise<number> {
    const { error } = await supabase
      .from('work_logs')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return ids.length;
  }

  async getWorklogHistory(userId: string, startDate: Date, endDate: Date): Promise<Worklog[]> {
    // Ensure startDate is at beginning of day
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    // Expand endDate to end of day for inclusive range
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('work_logs')
      .select(`
        id,
        hours,
        note,
        created_at,
        task_id,
        projects(name),
        tasks(name, type)
      `)
      .eq('user_id', userId)
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Worklog[];
  }
}

export const worklogService = new WorklogService();

