import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface AdminWorklog {
  id: string;
  created_at: string;
  hours: string;
  note: string | null;
  user_id: string | null;
  added_by: string | null;
  task: {
    id: string | null;
    name: string | null;
    status: string | null;
    category: string | null;
  } | null;
  project: {
    id: string | null;
    name: string | null;
    type: string | null;
  } | null;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    department: string | null;
    role: string | null;
  } | null;
}

export interface UserWithNoLog {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
}

type SupabaseAdminWorklogRow = {
  id: string;
  created_at: string;
  hours: string;
  note: string | null;
  user_id: string | null;
  added_by: string | null;
  tasks: {
    id: string | null;
    name: string | null;
    status: string | null;
    category: string | null;
  } | null;
  projects: {
    id: string | null;
    name: string | null;
    type: string | null;
  } | null;
  users: {
    id: string | null;
    name: string | null;
    email: string | null;
    department: string | null;
    role: string | null;
  } | null;
};

class AdminWorklogService {
  async getAllWorklogs(): Promise<AdminWorklog[]> {
    const { data, error } = await supabase
      .from('work_logs')
      .select(`
        id,
        created_at,
        hours,
        note,
        user_id,
        added_by,
        task_id,
        project_id,
        tasks (
          id,
          name,
          status,
          category
        ),
        projects (
          id,
          name,
          type
        ),
        users (
          id,
          name,
          email,
          department,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []) as unknown as SupabaseAdminWorklogRow[];

    return rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      hours: row.hours,
      note: row.note,
      user_id: row.user_id,
      added_by: row.added_by ?? null,
      task: row.tasks
        ? {
            id: row.tasks.id,
            name: row.tasks.name,
            status: row.tasks.status,
            category: row.tasks.category,
          }
        : null,
      project: row.projects
        ? {
            id: row.projects.id,
            name: row.projects.name,
            type: row.projects.type,
          }
        : null,
      user: row.users
        ? {
            id: row.users.id,
            name: row.users.name,
            email: row.users.email,
            department: row.users.department,
            role: row.users.role,
          }
        : null,
    }));
  }

  async getTodaysWorklogs(date: Date, projectId?: string | null, userId?: string | null): Promise<AdminWorklog[]> {
    const startOfDate = startOfDay(date);
    const endOfDate = endOfDay(date);

    let query = supabase
      .from('work_logs')
      .select(`
        id,
        created_at,
        hours,
        note,
        user_id,
        added_by,
        task_id,
        project_id,
        tasks (
          id,
          name,
          status,
          category
        ),
        projects (
          id,
          name,
          type
        ),
        users (
          id,
          name,
          email,
          department,
          role
        )
      `)
      .gte('created_at', startOfDate.toISOString())
      .lte('created_at', endOfDate.toISOString());

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []) as unknown as SupabaseAdminWorklogRow[];

    // Filter out worklogs for admin users
    return rows
      .filter((row) => row.users?.role !== 'Admin')
      .map((row) => ({
        id: row.id,
        created_at: row.created_at,
        hours: row.hours,
        note: row.note,
        user_id: row.user_id,
        added_by: row.added_by ?? null,
        task: row.tasks
          ? {
              id: row.tasks.id,
              name: row.tasks.name,
              status: row.tasks.status,
              category: row.tasks.category,
            }
          : null,
        project: row.projects
          ? {
              id: row.projects.id,
              name: row.projects.name,
              type: row.projects.type,
            }
          : null,
        user: row.users
          ? {
              id: row.users.id,
              name: row.users.name,
              email: row.users.email,
              department: row.users.department,
              role: row.users.role,
            }
          : null,
      }));
  }

  async getRecentWorklogs(days: number = 7, projectId?: string | null, userId?: string | null): Promise<AdminWorklog[]> {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());
    return this.getWorklogsByDateRange(startDate, endDate, projectId, userId);
  }

  async getWorklogsByDateRange(
    startDate: Date,
    endDate: Date,
    projectId?: string | null,
    userId?: string | null
  ): Promise<AdminWorklog[]> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    let query = supabase
      .from('work_logs')
      .select(`
        id,
        created_at,
        hours,
        note,
        user_id,
        added_by,
        task_id,
        project_id,
        tasks (
          id,
          name,
          status,
          category
        ),
        projects (
          id,
          name,
          type
        ),
        users (
          id,
          name,
          email,
          department,
          role
        )
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []) as unknown as SupabaseAdminWorklogRow[];

    // Filter out worklogs for admin users
    return rows
      .filter((row) => row.users?.role !== 'Admin')
      .map((row) => ({
        id: row.id,
        created_at: row.created_at,
        hours: row.hours,
        note: row.note,
        user_id: row.user_id,
        added_by: row.added_by ?? null,
        task: row.tasks
          ? {
              id: row.tasks.id,
              name: row.tasks.name,
              status: row.tasks.status,
              category: row.tasks.category,
            }
          : null,
        project: row.projects
          ? {
              id: row.projects.id,
              name: row.projects.name,
              type: row.projects.type,
            }
          : null,
        user: row.users
          ? {
              id: row.users.id,
              name: row.users.name,
              email: row.users.email,
              department: row.users.department,
              role: row.users.role,
            }
          : null,
      }));
  }

  async getUsersWithNoLogs(date: Date): Promise<UserWithNoLog[]> {
    const startOfDate = startOfDay(date);
    const endOfDate = endOfDay(date);

    // Get all active users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, department')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (usersError) {
      throw usersError;
    }

    // Get users who have logged work on this date
    const { data: usersWithLogs, error: logsError } = await supabase
      .from('work_logs')
      .select('user_id')
      .gte('created_at', startOfDate.toISOString())
      .lte('created_at', endOfDate.toISOString())
      .not('user_id', 'is', null);

    if (logsError) {
      throw logsError;
    }

    const userIdsWithLogs = new Set((usersWithLogs || []).map((log) => log.user_id).filter(Boolean));

    // Filter out users who have logs and exclude admin users
    const usersWithNoLogs = (allUsers || []).filter(
      (user) => !userIdsWithLogs.has(user.id) && user.role !== 'Admin'
    ) as UserWithNoLog[];

    return usersWithNoLogs;
  }

  async createWorklogForUser(data: {
    user_id: string;
    task_id: string;
    project_id: string;
    hours: string;
    note?: string | null;
    created_at: string;
    added_by: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('work_logs')
      .insert({
        user_id: data.user_id,
        task_id: data.task_id,
        project_id: data.project_id,
        hours: data.hours,
        note: data.note,
        created_at: data.created_at,
        added_by: data.added_by,
      });

    if (error) {
      throw error;
    }
  }

  async updateWorklog(worklogId: string, data: {
    user_id?: string;
    task_id?: string;
    project_id?: string;
    hours?: string;
    note?: string | null;
    created_at?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('work_logs')
      .update(data)
      .eq('id', worklogId);

    if (error) {
      throw error;
    }
  }

  async deleteWorklog(worklogId: string): Promise<void> {
    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('id', worklogId);

    if (error) {
      throw error;
    }
  }
}

export const adminWorklogService = new AdminWorklogService();


