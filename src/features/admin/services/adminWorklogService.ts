import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { parseHours } from '@/shared/utils/formatHours';

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
  totalHours: number;
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
          name
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

  async getWorklogsByTask(taskId: string): Promise<AdminWorklog[]> {
    if (!taskId) {
      return [];
    }

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
          name
        ),
        users (
          id,
          name,
          email,
          department,
          role
        )
      `)
      .eq('task_id', taskId)
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
          name
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
          name
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
    const MINIMUM_HOURS_PER_DAY = 8;
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
      .select('user_id, hours, hours_num')
      .gte('created_at', startOfDate.toISOString())
      .lte('created_at', endOfDate.toISOString())
      .not('user_id', 'is', null);

    if (logsError) {
      throw logsError;
    }

    const userHoursMap = new Map<string, number>();

    (usersWithLogs || []).forEach((log) => {
      if (!log.user_id) return;
      const numericHours =
        typeof log.hours_num === 'number' && !Number.isNaN(log.hours_num)
          ? log.hours_num
          : parseHours(log.hours);
      const current = userHoursMap.get(log.user_id) || 0;
      userHoursMap.set(log.user_id, current + (numericHours || 0));
    });

    // Filter out admin users and include those who are below minimum hours
    const usersBelowTarget: UserWithNoLog[] = (allUsers || [])
      .filter((user) => user.role !== 'Admin')
      .map((user) => {
        const totalHours = userHoursMap.get(user.id) || 0;
        return { ...user, totalHours } as UserWithNoLog;
      })
      .filter((user) => user.totalHours < MINIMUM_HOURS_PER_DAY);

    return usersBelowTarget;
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
    // Convert hours string (HH:MM) to numeric decimal
    const hoursNum = parseHours(data.hours);
    
    const { error } = await supabase
      .from('work_logs')
      .insert({
        user_id: data.user_id,
        task_id: data.task_id,
        project_id: data.project_id,
        hours: data.hours,
        hours_num: hoursNum,
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
    // If hours is being updated, also calculate and update hours_num
    const updateData: typeof data & { hours_num?: number } = { ...data };
    
    if (data.hours !== undefined) {
      // Convert hours string (HH:MM) to numeric decimal
      updateData.hours_num = parseHours(data.hours);
    }
    
    const { error } = await supabase
      .from('work_logs')
      .update(updateData)
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


