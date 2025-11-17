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
   * Calculate project efficiency stats
   */
  async getProjectEfficiencyStats(
    projectId: string,
    dateRange: string = 'last-30-days',
    customStart?: Date,
    customEnd?: Date
  ): Promise<ProjectEfficiencyStats> {
    const { start, end } = this.getDateRange(dateRange, customStart, customEnd);
    const { start: prevStart, end: prevEnd } = this.getPreviousPeriod(dateRange, customStart, customEnd);

    // Get worklogs for current period
    const { data: worklogs, error: worklogsError } = await supabase
      .from('work_logs')
      .select('hours, created_at, user_id')
      .eq('project_id', projectId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (worklogsError) throw worklogsError;

    // Get worklogs for previous period (for comparison)
    const { data: prevWorklogs } = await supabase
      .from('work_logs')
      .select('hours, created_at, user_id')
      .eq('project_id', projectId)
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString());

    // Calculate total hours
    const totalHours = (worklogs || []).reduce((sum, log) => sum + parseHours(log.hours), 0);
    const prevTotalHours = (prevWorklogs || []).reduce((sum, log) => sum + parseHours(log.hours), 0);
    const totalHoursChange = prevTotalHours > 0 
      ? ((totalHours - prevTotalHours) / prevTotalHours) * 100 
      : 0;

    // Calculate active days (unique days with worklogs)
    const activeDays = new Set((worklogs || []).map(log => format(new Date(log.created_at), 'yyyy-MM-dd'))).size;
    const prevActiveDays = new Set((prevWorklogs || []).map(log => format(new Date(log.created_at), 'yyyy-MM-dd'))).size;
    const activeDaysChange = prevActiveDays > 0 
      ? ((activeDays - prevActiveDays) / prevActiveDays) * 100 
      : 0;

    // Get tasks completed in current period for this project
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .gte('updated_at', start.toISOString())
      .lte('updated_at', end.toISOString());

    // Get tasks completed in previous period
    const { data: prevCompletedTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .gte('updated_at', prevStart.toISOString())
      .lte('updated_at', prevEnd.toISOString());

    const tasksCompleted = completedTasks?.length || 0;
    const prevTasksCompleted = prevCompletedTasks?.length || 0;
    const tasksCompletedChange = prevTasksCompleted > 0 
      ? ((tasksCompleted - prevTasksCompleted) / prevTasksCompleted) * 100 
      : 0;

    // Calculate unique team members (users who logged work)
    const teamMembers = new Set((worklogs || []).map(log => log.user_id)).size;
    const prevTeamMembers = new Set((prevWorklogs || []).map(log => log.user_id)).size;
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
   * Get daily hours data for selected project
   */
  async getProjectDailyHours(
    projectId: string,
    dateRange: string = 'last-30-days',
    customStart?: Date,
    customEnd?: Date
  ): Promise<ProjectDailyHoursData[]> {
    const { start, end } = this.getDateRange(dateRange, customStart, customEnd);

    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select('hours, created_at')
      .eq('project_id', projectId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyHoursMap = new Map<string, number>();

    (worklogs || []).forEach(log => {
      const dateKey = format(new Date(log.created_at), 'yyyy-MM-dd');
      const currentHours = dailyHoursMap.get(dateKey) || 0;
      dailyHoursMap.set(dateKey, currentHours + parseHours(log.hours));
    });

    // Convert to array and fill missing dates with 0
    const result: ProjectDailyHoursData[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      result.push({
        date: format(currentDate, 'MMM dd'),
        hours: dailyHoursMap.get(dateKey) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Get hours by user for selected project
   */
  async getHoursByUser(
    projectId: string,
    dateRange: string = 'last-30-days',
    customStart?: Date,
    customEnd?: Date
  ): Promise<HoursByUserData[]> {
    const { start, end } = this.getDateRange(dateRange, customStart, customEnd);

    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select('hours, user_id, users!inner(id, name)')
      .eq('project_id', projectId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

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

