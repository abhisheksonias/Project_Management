import { supabase } from '@/integrations/supabase/client';
import { parseHours } from '@/shared/utils/formatHours';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';

export interface EfficiencyStats {
  totalHours: number;
  totalHoursChange: number; // percentage change
  activeDays: number;
  activeDaysChange: number;
  projectsContributed: number;
  projectsContributedChange: number;
  efficiencyPercent: number;
  efficiencyPercentChange: number;
}

export interface DailyHoursData {
  date: string;
  hours: number;
}

export interface HoursByProjectData {
  projectId: string;
  projectName: string;
  hours: number;
}

export interface RecentWorklog {
  id: string;
  date: string;
  projectName: string;
  taskName: string;
  hours: string;
}

class EfficiencyService {
  /**
   * Get date range based on filter
   * Prioritizes customStart/customEnd if provided, otherwise uses dateRange
   */
  private getDateRange(dateRange: string, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
    const now = new Date();
    
    // If custom dates are explicitly provided, always use them (highest priority)
    // This allows page to pass calculated dates directly
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
        // If custom but no dates provided, default to last 30 days
        return {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now),
        };
      }
      default: {
        // Default to last 30 days
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
   * Calculate efficiency stats
   */
  async getEfficiencyStats(
    userId?: string,
    dateRange: string = 'last-30-days',
    customStart?: Date,
    customEnd?: Date
  ): Promise<EfficiencyStats> {
    const { start, end } = this.getDateRange(dateRange, customStart, customEnd);
    const { start: prevStart, end: prevEnd } = this.getPreviousPeriod(dateRange, customStart, customEnd);

    // Get admin user IDs to exclude
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'Admin']);
    
    const adminIds = adminUsers?.map(u => u.id) || [];

    // Use user_month_hours view for better performance when possible
    // For month-based ranges, use the view; otherwise use work_logs
    const isMonthBased = dateRange === 'this-month' || dateRange === 'last-month';
    
    let totalHours = 0;
    let worklogs: any[] = [];
    let activeDaysSet = new Set<string>();

    if (isMonthBased && !userId) {
      // Use view for team stats in month-based ranges
      const monthStart = format(startOfMonth(start), 'yyyy-MM-dd');
      const { data: monthHours, error: viewError } = await supabase
        .from('user_month_hours')
        .select('user_id, total_hours')
        .eq('month_start', monthStart);

      if (!viewError && monthHours) {
        // Filter out admin users
        const filteredHours = monthHours.filter(row => !adminIds.includes(row.user_id));
        totalHours = filteredHours.reduce((sum, row) => sum + parseFloat(row.total_hours || 0), 0);
        
        // Still need worklogs for active days calculation
        const { data: worklogsData } = await supabase
          .from('work_logs')
          .select('created_at, user_id')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        
        worklogs = (worklogsData || []).filter(log => !adminIds.includes(log.user_id));
        activeDaysSet = new Set(worklogs.map(log => format(new Date(log.created_at), 'yyyy-MM-dd')));
      } else {
        // Fallback to work_logs
        throw viewError || new Error('Failed to fetch from view');
      }
    } else {
      // Use work_logs for custom ranges or user-specific queries
      let worklogsQuery = supabase
        .from('work_logs')
        .select('hours, created_at, user_id, project_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (userId) {
        worklogsQuery = worklogsQuery.eq('user_id', userId);
      }

      const { data: allWorklogs, error: worklogsError } = await worklogsQuery;

      if (worklogsError) throw worklogsError;

      // Filter out admin users if not filtering by specific user
      worklogs = userId 
        ? (allWorklogs || [])
        : (allWorklogs || []).filter(log => !adminIds.includes(log.user_id));
      
      totalHours = worklogs.reduce((sum, log) => sum + parseHours(log.hours), 0);
      activeDaysSet = new Set(worklogs.map(log => format(new Date(log.created_at), 'yyyy-MM-dd')));
    }

    // Get worklogs for previous period (for comparison)
    let prevWorklogsQuery = supabase
      .from('work_logs')
      .select('hours, created_at, user_id, project_id')
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString());

    if (userId) {
      prevWorklogsQuery = prevWorklogsQuery.eq('user_id', userId);
    }

    const { data: allPrevWorklogs } = await prevWorklogsQuery;

    // Filter out admin users if not filtering by specific user
    const prevWorklogs = userId 
      ? (allPrevWorklogs || [])
      : (allPrevWorklogs || []).filter(log => !adminIds.includes(log.user_id));

    // Calculate previous period stats
    const prevTotalHours = (prevWorklogs || []).reduce((sum, log) => sum + parseHours(log.hours), 0);
    const totalHoursChange = prevTotalHours > 0 
      ? ((totalHours - prevTotalHours) / prevTotalHours) * 100 
      : 0;

    // Calculate active days (unique days with worklogs)
    const activeDays = activeDaysSet.size;
    const prevActiveDays = new Set((prevWorklogs || []).map(log => format(new Date(log.created_at), 'yyyy-MM-dd'))).size;
    const activeDaysChange = prevActiveDays > 0 
      ? ((activeDays - prevActiveDays) / prevActiveDays) * 100 
      : 0;

    const projectContributionCount = new Set(
      (worklogs || []).map((log) => log.project_id).filter(Boolean)
    ).size;

    const prevProjectContributionCount = new Set(
      (prevWorklogs || []).map((log) => log.project_id).filter(Boolean)
    ).size;

    const projectsContributed = projectContributionCount;
    const projectsContributedChange = prevProjectContributionCount > 0 
      ? ((projectsContributed - prevProjectContributionCount) / prevProjectContributionCount) * 100 
      : 0;

    // Calculate efficiency percentage
    // Efficiency = (hours logged / expected hours) * 100
    // Expected hours: For last 30 days, assume 8 hours per working day (20 working days = 160 hours)
    const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const expectedWorkingDays = Math.floor(daysInPeriod * (5 / 7)); // 5 working days per week
    const expectedHours = expectedWorkingDays * 8;
    
    const efficiencyPercent = expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;

    // Previous period efficiency
    const prevDaysInPeriod = Math.ceil((prevEnd.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24));
    const prevExpectedWorkingDays = Math.floor(prevDaysInPeriod * (5 / 7));
    const prevExpectedHours = prevExpectedWorkingDays * 8;
    const prevEfficiencyPercent = prevExpectedHours > 0 ? (prevTotalHours / prevExpectedHours) * 100 : 0;
    
    const efficiencyPercentChange = prevEfficiencyPercent > 0 
      ? ((efficiencyPercent - prevEfficiencyPercent) / prevEfficiencyPercent) * 100 
      : 0;

    return {
      totalHours,
      totalHoursChange,
      activeDays,
      activeDaysChange,
      projectsContributed,
      projectsContributedChange,
      efficiencyPercent,
      efficiencyPercentChange,
    };
  }

  /**
   * Get daily hours data for selected user
   */
  async getDailyHours(
    userId: string,
    dateRange: string = 'last-30-days',
    customStart?: Date,
    customEnd?: Date
  ): Promise<DailyHoursData[]> {
    const { start, end } = this.getDateRange(dateRange, customStart, customEnd);

    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select('hours, created_at')
      .eq('user_id', userId)
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
    const result: DailyHoursData[] = [];
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
   * Get hours by project using user_project_month_hours view
   */
  async getHoursByProject(
    userId?: string,
    dateRange: string = 'last-30-days',
    customStart?: Date,
    customEnd?: Date
  ): Promise<HoursByProjectData[]> {
    const { start, end } = this.getDateRange(dateRange, customStart, customEnd);

    // Get all months in the date range
    const months: Date[] = [];
    const currentMonth = new Date(start);
    while (currentMonth <= end) {
      months.push(new Date(currentMonth));
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Get admin user IDs to exclude
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'Admin']);
    
    const adminIds = adminUsers?.map(u => u.id) || [];

    // Fetch data from user_project_month_hours view for all months
    const monthStarts = months.map(m => format(startOfMonth(m), 'yyyy-MM-dd'));
    
    let viewQuery = supabase
      .from('user_project_month_hours')
      .select('user_id, project_id, month_start, total_hours, projects!inner(id, name)')
      .in('month_start', monthStarts);

    if (userId) {
      viewQuery = viewQuery.eq('user_id', userId);
    }

    const { data: viewData, error } = await viewQuery;

    if (error) throw error;

    // Filter out admin users and projects outside date range
    const filteredData = (viewData || []).filter(row => {
      if (!userId && adminIds.includes(row.user_id)) return false;
      
      const rowMonth = new Date(row.month_start);
      return rowMonth >= startOfMonth(start) && rowMonth <= startOfMonth(end);
    });

    // Group by project and sum hours
    const projectHoursMap = new Map<string, { name: string; hours: number }>();

    filteredData.forEach(row => {
      const projectId = row.project_id;
      if (!projectId) return;
      
      const projectName = (row.projects as any)?.name || 'Unknown Project';
      const currentHours = projectHoursMap.get(projectId)?.hours || 0;
      
      projectHoursMap.set(projectId, {
        name: projectName,
        hours: currentHours + parseFloat(row.total_hours || 0),
      });
    });

    // Convert to array and sort by hours descending
    return Array.from(projectHoursMap.entries())
      .map(([projectId, data]) => ({
        projectId,
        projectName: data.name,
        hours: data.hours,
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  /**
   * Get recent worklogs for selected user
   */
  async getRecentWorklogs(
    userId: string,
    limit: number = 10
  ): Promise<RecentWorklog[]> {
    const { data: worklogs, error } = await supabase
      .from('work_logs')
      .select(`
        id,
        hours,
        created_at,
        projects!inner(name),
        tasks!inner(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (worklogs || []).map(log => ({
      id: log.id,
      date: format(new Date(log.created_at), 'yyyy-MM-dd'),
      projectName: (log.projects as any)?.name || '—',
      taskName: (log.tasks as any)?.name || '—',
      hours: log.hours || '0:00',
    }));
  }
}

export const efficiencyService = new EfficiencyService();

