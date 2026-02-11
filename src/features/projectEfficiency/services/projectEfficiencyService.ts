import { supabase } from '@/integrations/supabase/client';
import { parseHours } from '@/shared/utils/formatHours';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';

export interface ProjectEfficiencyStats {
  totalHours: number;
  totalHoursChange: number; // percentage change
  activeDays: number;
  activeDaysChange: number;
  tasksCompleted: number;
  tasksCompletedChange: number;
  teamMembers: number;
  teamMembersChange: number;
}

export interface ProjectDailyHoursData {
  date: string;
  hours: number;
}

export interface HoursByUserData {
  userId: string;
  userName: string;
  hours: number;
}

export interface HoursByTaskContribution {
  userId: string;
  userName: string;
  hours: number;
}

export interface HoursByTaskData {
  taskId: string;
  taskName: string;
  hours: number;
  contributions: HoursByTaskContribution[];
}

export interface ProjectRecentWorklog {
  id: string;
  date: string;
  userName: string;
  taskName: string;
  hours: string;
}

class ProjectEfficiencyService {
  /**
   * Get date range based on filter
   * Prioritizes customStart/customEnd if provided, otherwise uses dateRange
   */
  private getDateRange(dateRange: string, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
    const now = new Date();
    
    // If custom dates are explicitly provided, always use them (highest priority)
    if (customStart && customEnd) {
      return {
        start: startOfDay(customStart),
        end: endOfDay(customEnd),
      };
    }

    // Handle predefined date ranges
    switch (dateRange) {
      case 'today': {
        const today = new Date(now);
        return {
          start: startOfDay(today),
          end: endOfDay(today),
        };
      }
      case 'this-week': {
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      }
      case 'last-month': {
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        };
      }
      case 'last-30-days': {
        return {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now),
        };
      }
      case 'this-month': {
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      }
      case 'this-quarter': {
        return {
          start: startOfQuarter(now),
          end: endOfQuarter(now),
        };
      }
      case 'this-year': {
        return {
          start: startOfYear(now),
          end: endOfYear(now),
        };
      }
      case 'custom': {
        return {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now),
        };
      }
      default: {
        return {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now),
        };
      }
    }
  }

  /**
   * Get previous period date range for comparison
   */
  private getPreviousPeriod(dateRange: string, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
    const current = this.getDateRange(dateRange, customStart, customEnd);
    const daysDiff = Math.ceil((current.end.getTime() - current.start.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      start: new Date(current.start.getTime() - daysDiff * 24 * 60 * 60 * 1000),
      end: new Date(current.start.getTime() - 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Calculate project efficiency stats (all-time data)
   * Uses user_project_month_hours view for better performance
   */
  async getProjectEfficiencyStats(
    projectId: string
  ): Promise<ProjectEfficiencyStats> {
    // Try to use user_project_month_hours view for total hours calculation
    const { data: viewData, error: viewError } = await supabase
      .from('user_project_month_hours')
      .select('user_id, month_start, total_hours')
      .eq('project_id', projectId);

    let totalHours = 0;
    let worklogs: any[] = [];
    let activeDaysSet = new Set<string>();

    if (!viewError && viewData && viewData.length > 0) {
      // Calculate total hours from view
      totalHours = viewData.reduce((sum, row) => sum + parseFloat(row.total_hours || 0), 0);
      
      // Still need work_logs for active days calculation
      const { data: worklogsData } = await supabase
        .from('work_logs')
        .select('created_at, user_id')
        .eq('project_id', projectId);
      
      worklogs = worklogsData || [];
      activeDaysSet = new Set(worklogs.map(log => format(new Date(log.created_at), 'yyyy-MM-dd')));
    } else {
      // Fallback to work_logs
      let worklogsQuery = supabase
        .from('work_logs')
        .select('hours, created_at, user_id')
        .eq('project_id', projectId);

      const { data: worklogsData, error: worklogsError } = await worklogsQuery;

      if (worklogsError) throw worklogsError;
      
      worklogs = worklogsData || [];
      totalHours = worklogs.reduce((sum, log) => sum + parseHours(log.hours), 0);
      activeDaysSet = new Set(worklogs.map(log => format(new Date(log.created_at), 'yyyy-MM-dd')));
    }

    // For all-time stats, we don't compare with previous period
    // Set previous period data to empty for comparison
    const prevWorklogs: any[] = [];

    // For all-time stats, we don't compare with previous period
    const prevTotalHours = 0;
    const totalHoursChange = 0;

    // Calculate active days (unique days with worklogs)
    const activeDays = activeDaysSet.size;
    const prevActiveDays = 0;
    const activeDaysChange = prevActiveDays > 0 
      ? ((activeDays - prevActiveDays) / prevActiveDays) * 100 
      : 0;

    // Get all completed tasks for this project (all-time)
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', projectId)
      .ilike('status', 'completed%');

    // For all-time stats, no previous period comparison
    const prevCompletedTasks: any[] = [];

    const tasksCompleted = completedTasks?.length || 0;
    const prevTasksCompleted = prevCompletedTasks?.length || 0;
    const tasksCompletedChange = prevTasksCompleted > 0 
      ? ((tasksCompleted - prevTasksCompleted) / prevTasksCompleted) * 100 
      : 0;

    // Calculate unique team members (users who logged work)
    const teamMembers = new Set(worklogs.map(log => log.user_id)).size;
    const prevTeamMembers = 0;
    const teamMembersChange = prevTeamMembers > 0 
      ? ((teamMembers - prevTeamMembers) / prevTeamMembers) * 100 
      : 0;

    return {
      totalHours,
      totalHoursChange,
      activeDays,
      activeDaysChange,
      tasksCompleted,
      tasksCompletedChange,
      teamMembers,
      teamMembersChange,
    };
  }

  /**
   * Get daily hours data for selected project (all-time)
   */
  async getProjectDailyHours(
    projectId: string
  ): Promise<ProjectDailyHoursData[]> {
    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select('hours, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyHoursMap = new Map<string, number>();

    (worklogs || []).forEach(log => {
      const dateKey = format(new Date(log.created_at), 'yyyy-MM-dd');
      const currentHours = dailyHoursMap.get(dateKey) || 0;
      dailyHoursMap.set(dateKey, currentHours + parseHours(log.hours));
    });

    // Convert to array, sorted by date (using dateKey for proper chronological order)
    const result: ProjectDailyHoursData[] = Array.from(dailyHoursMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by dateKey (yyyy-MM-dd) for proper chronological order
      .map(([dateKey, hours]) => ({
        date: format(new Date(dateKey), 'MMM dd'),
        hours,
      }));

    return result;
  }

  /**
   * Get hours by user for selected project using user_project_month_hours view
   */
  async getHoursByUser(
    projectId: string
  ): Promise<HoursByUserData[]> {
    // Try to use user_project_month_hours view first
    const { data: viewData, error: viewError } = await supabase
      .from('user_project_month_hours')
      .select('user_id, total_hours, users!inner(id, name)')
      .eq('project_id', projectId);

    // If view works, use it; otherwise fallback to work_logs
    if (!viewError && viewData && viewData.length > 0) {
      // Group by user and sum hours
      const userHoursMap = new Map<string, { name: string; hours: number }>();

      viewData.forEach(row => {
        const userId = row.user_id;
        const userName = (row.users as any)?.name || 'Unknown User';
        const currentHours = userHoursMap.get(userId)?.hours || 0;
        
        userHoursMap.set(userId, {
          name: userName,
          hours: currentHours + parseFloat(row.total_hours || 0),
        });
      });

      // Convert to array and sort by hours descending
      return Array.from(userHoursMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.name,
          hours: data.hours,
        }))
        .sort((a, b) => b.hours - a.hours);
    }

    // Fallback to work_logs
    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select('hours, user_id, users!inner(id, name)')
      .eq('project_id', projectId);

    if (error) throw error;

    // Group by user
    const userHoursMap = new Map<string, { name: string; hours: number }>();

    (worklogs || []).forEach(log => {
      const userId = log.user_id;
      const userName = (log.users as any)?.name || 'Unknown User';
      const currentHours = userHoursMap.get(userId)?.hours || 0;
      
      userHoursMap.set(userId, {
        name: userName,
        hours: currentHours + parseHours(log.hours),
      });
    });

    // Convert to array and sort by hours descending
    return Array.from(userHoursMap.entries())
      .map(([userId, data]) => ({
        userId,
        userName: data.name,
        hours: data.hours,
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  /**
   * Get hours by task for selected project (all-time)
   */
  async getHoursByTask(
    projectId: string
  ): Promise<HoursByTaskData[]> {
    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select('hours, task_id, user_id, users!inner(id, name), tasks!inner(id, name)')
      .eq('project_id', projectId);

    if (error) throw error;

    const taskHoursMap = new Map<
      string,
      { name: string; hours: number; contributions: Map<string, { name: string; hours: number }> }
    >();

    (worklogs || []).forEach((log) => {
      const taskId = log.task_id;
      if (!taskId) {
        return;
      }

      const taskName = (log.tasks as any)?.name || 'Untitled Task';
      const userId = log.user_id;
      const userName = (log.users as any)?.name || 'Unknown User';
      const parsedHours = parseHours(log.hours);

      if (!taskHoursMap.has(taskId)) {
        taskHoursMap.set(taskId, {
          name: taskName,
          hours: 0,
          contributions: new Map(),
        });
      }

      const taskEntry = taskHoursMap.get(taskId)!;
      taskEntry.hours += parsedHours;

      if (userId) {
        const contributionMap = taskEntry.contributions;
        const current = contributionMap.get(userId) || { name: userName, hours: 0 };
        current.hours += parsedHours;
        contributionMap.set(userId, current);
      }
    });

    return Array.from(taskHoursMap.entries())
      .map(([taskId, data]) => ({
        taskId,
        taskName: data.name,
        hours: data.hours,
        contributions: Array.from(data.contributions.entries())
          .map(([userId, contribution]) => ({
            userId,
            userName: contribution.name,
            hours: contribution.hours,
          }))
          .sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  /**
   * Get recent worklogs for selected project
   */
  async getProjectRecentWorklogs(
    projectId: string,
    limit: number = 10
  ): Promise<ProjectRecentWorklog[]> {
    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select(`
        id,
        hours,
        created_at,
        users!inner(name),
        tasks!inner(name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (worklogs || []).map(log => ({
      id: log.id,
      date: format(new Date(log.created_at), 'yyyy-MM-dd'),
      userName: (log.users as any)?.name || '—',
      taskName: (log.tasks as any)?.name || '—',
      hours: log.hours || '0:00',
    }));
  }
}

export const projectEfficiencyService = new ProjectEfficiencyService();

