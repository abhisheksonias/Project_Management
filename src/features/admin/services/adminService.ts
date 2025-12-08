import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subWeeks } from 'date-fns';
import { parseHours } from '@/shared/utils/formatHours';

export interface AdminStats {
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  inProgressTasks: number;
  hoursLoggedThisWeek: number;
}

export type DateRangeOption = 'today' | 'this-week' | 'this-month' | 'last-month' | 'last-30-days' | 'this-quarter' | 'this-year' | 'custom';

export interface AdminFilters {
  dateRange?: DateRangeOption;
  startDate?: Date;
  endDate?: Date;
  reportingPeriod?: 'this-week' | 'this-month' | 'this-quarter' | 'this-year'; // Deprecated, use dateRange
  projectId?: string | null;
  department?: string | null;
}

export interface ProjectWithHours {
  id: string;
  name: string;
  client?: string;
  hours: number;
  status: string;
  deadline?: string | null;
}

export interface DailyHoursData {
  date: string;
  hours: number;
  billableHours: number;
  nonBillableHours: number;
  fullDate: string; // Full date for tooltip
  formattedDate: string; // Formatted date for display
}

class AdminService {
  async getAllProjects(): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  getDateRange(filters?: AdminFilters): { start: Date; end: Date } {
    const now = new Date();
    
    // If startDate and endDate are explicitly provided, use them (for custom ranges)
    if (filters?.startDate && filters?.endDate) {
      return {
        start: filters.startDate,
        end: filters.endDate,
      };
    }

    // Use dateRange if provided, otherwise fall back to reportingPeriod for backward compatibility
    const dateRange = filters?.dateRange || filters?.reportingPeriod;
    
    // If no dateRange specified, default to this month
    if (!dateRange) {
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      return {
        start: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
      };
    }
    
    // Get current UTC date components
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    
    switch (dateRange) {
      case 'today': {
        // Today in UTC
        const todayStart = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
        const todayEnd = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
        return { start: todayStart, end: todayEnd };
      }
      case 'this-week': {
        // Week starts on Monday (1), calculate days to subtract
        // getUTCDay() returns 0 (Sunday) to 6 (Saturday)
        const daysToMonday = day === 0 ? 6 : day - 1; // If Sunday, go back 6 days, otherwise go back (day - 1)
        
        // Create date for Monday of this week
        const weekStart = new Date(Date.UTC(year, month, date - daysToMonday, 0, 0, 0, 0));
        // Create date for Sunday of this week (6 days after Monday)
        const weekEnd = new Date(Date.UTC(year, month, date - daysToMonday + 6, 23, 59, 59, 999));
        return { start: weekStart, end: weekEnd };
      }
      case 'last-month': {
        // Last month in UTC
        const lastMonthYear = month === 0 ? year - 1 : year;
        const lastMonthMonth = month === 0 ? 11 : month - 1;
        // Get last day of last month
        const lastDay = new Date(Date.UTC(lastMonthYear, lastMonthMonth + 1, 0)).getUTCDate();
        const lastMonthStart = new Date(Date.UTC(lastMonthYear, lastMonthMonth, 1, 0, 0, 0, 0));
        const lastMonthEnd = new Date(Date.UTC(lastMonthYear, lastMonthMonth, lastDay, 23, 59, 59, 999));
        return {
          start: lastMonthStart,
          end: lastMonthEnd,
        };
      }
      case 'last-30-days': {
        // Last 30 days ending today
        const last30Start = new Date(Date.UTC(year, month, date - 29, 0, 0, 0, 0));
        const last30End = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
        return {
          start: last30Start,
          end: last30End,
        };
      }
      case 'this-month': {
        const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const monthEnd = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999));
        return {
          start: monthStart,
          end: monthEnd,
        };
      }
      case 'this-quarter': {
        const quarter = Math.floor(month / 3);
        const quarterStartMonth = quarter * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        const quarterStart = new Date(Date.UTC(year, quarterStartMonth, 1, 0, 0, 0, 0));
        const lastDay = new Date(Date.UTC(year, quarterEndMonth + 1, 0)).getUTCDate();
        const quarterEnd = new Date(Date.UTC(year, quarterEndMonth, lastDay, 23, 59, 59, 999));
        return {
          start: quarterStart,
          end: quarterEnd,
        };
      }
      case 'this-year': {
        const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        return {
          start: yearStart,
          end: yearEnd,
        };
      }
      default: {
        const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const monthEnd = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999));
        return {
          start: monthStart,
          end: monthEnd,
        };
      }
    }
  }

  async getAdminStats(filters?: AdminFilters): Promise<AdminStats> {
    const now = new Date();
    const dateRange = this.getDateRange(filters);
    
    // Ensure proper time boundaries for date range
    const queryStartDate = new Date(dateRange.start);
    const queryEndDate = new Date(dateRange.end);
    queryStartDate.setHours(0, 0, 0, 0);
    queryEndDate.setHours(23, 59, 59, 999);

    // Helper to build base project query with shared filters
    const buildProjectsQuery = () => {
      let query = supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      if (filters?.projectId) {
        query = query.eq('id', filters.projectId);
      }

      return query;
    };

    // Get active projects (status explicitly marked as in progress)
    const { count: activeProjectsCount } = await buildProjectsQuery()
      .ilike('status', 'in progress');

    // Get completed projects
    const { count: completedProjectsCount } = await buildProjectsQuery()
      .ilike('status', 'completed');

    // Get overdue projects (deadline passed and status not completed/cancelled)
    const overdueProjectsQuery = buildProjectsQuery()
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'cancelled')
      .not('deadline', 'is', null)
      .lt('deadline', now.toISOString());
    
    const { count: overdueProjectsCount } = await overdueProjectsQuery;

    const buildTasksQuery = () => {
      let query = supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
    }

    if (filters?.department && filters.department !== 'all') {
        const category = filters.department === 'design' ? 'design' : 'development';
        query = query.eq('category', category);
    }

      return query;
    };

    // Get active tasks explicitly marked as in progress
    const { count: inProgressTasksCount } = await buildTasksQuery()
      .ilike('status', 'in progress');

    // Get hours logged for the selected period
    let worklogsQuery = supabase
      .from('work_logs')
      .select('hours, project_id, user_id, tasks(category)')
      .gte('created_at', queryStartDate.toISOString())
      .lte('created_at', queryEndDate.toISOString());

    // Apply project filter
    if (filters?.projectId) {
      worklogsQuery = worklogsQuery.eq('project_id', filters.projectId);
    }

    // Apply department filter (filter by task category)
    if (filters?.department && filters.department !== 'all') {
      const category = filters.department === 'design' ? 'design' : 'development';
      // Note: We can't filter directly on joined table, so we'll filter in post-processing
      // For now, we'll get all worklogs and filter by task category in code
    }

    const { data: weekWorklogs } = await worklogsQuery;

    // Filter by department if specified (filter by task category)
    let filteredWorklogs = weekWorklogs;
    if (filters?.department && filters.department !== 'all') {
      const category = filters.department === 'design' ? 'design' : 'development';
      filteredWorklogs = weekWorklogs?.filter((log) => {
        const task = log.tasks as any;
        return task?.category === category;
      });
    }

    const hoursLoggedThisWeek = filteredWorklogs?.reduce((sum, log) => {
      return sum + parseHours(log.hours);
    }, 0) || 0;

    return {
      activeProjects: activeProjectsCount || 0,
      completedProjects: completedProjectsCount || 0,
      overdueProjects: overdueProjectsCount || 0,
      inProgressTasks: inProgressTasksCount || 0,
      hoursLoggedThisWeek: Math.round(hoursLoggedThisWeek * 10) / 10,
    };
  }

  async getTopProjects(limit: number = 5, filters?: AdminFilters): Promise<ProjectWithHours[]> {
    // If filters is undefined, return constant data (all-time top projects)
    // This is used for dashboard where we want consistent top projects
    let worklogsQuery = supabase
      .from('work_logs')
      .select(`
        hours,
        project_id,
        projects!inner(
          id,
          name,
          status,
          deadline
        ),
        tasks(
          category
        )
      `);

    // Apply date range filter only if filters are provided
    // If filters is undefined, get all-time data (constant)
    if (filters) {
      let queryStartDate: Date;
      let queryEndDate: Date;
      
      if (filters.startDate && filters.endDate) {
        queryStartDate = new Date(filters.startDate);
        queryEndDate = new Date(filters.endDate);
        queryStartDate.setHours(0, 0, 0, 0);
        queryEndDate.setHours(23, 59, 59, 999);
      } else if (filters.dateRange || filters.reportingPeriod) {
        const dateRange = this.getDateRange(filters);
        queryStartDate = new Date(dateRange.start);
        queryEndDate = new Date(dateRange.end);
        queryStartDate.setHours(0, 0, 0, 0);
        queryEndDate.setHours(23, 59, 59, 999);
      } else {
        // Default: all time (no date filter)
        queryStartDate = new Date(0);
        queryEndDate = new Date();
        queryEndDate.setHours(23, 59, 59, 999);
      }
      
      worklogsQuery = worklogsQuery
        .gte('created_at', queryStartDate.toISOString())
        .lte('created_at', queryEndDate.toISOString());

      if (filters.projectId) {
        worklogsQuery = worklogsQuery.eq('project_id', filters.projectId);
      }
    }
    // If filters is undefined, no date filtering - get all-time data (constant)

    const { data: worklogs, error } = await worklogsQuery;

    if (error) throw error;

    // Filter by department if specified (filter by task category in post-processing)
    // Only apply department filter if filters are provided
    let filteredWorklogs = worklogs;
    if (filters && filters.department && filters.department !== 'all') {
      const category = filters.department === 'design' ? 'design' : 'development';
      filteredWorklogs = worklogs?.filter((log) => {
        const task = log.tasks as any;
        return Array.isArray(task) ? task.some((t: any) => t?.category === category) : task?.category === category;
      });
    }

    // Aggregate hours by project
    const projectHoursMap = new Map<string, { name: string; hours: number; status: string; deadline: string | null }>();

    filteredWorklogs?.forEach((log) => {
      if (log.projects && log.project_id) {
        const project = log.projects as { id: string; name: string; status: string; deadline: string | null };
        const hours = parseHours(log.hours);
        
        // Skip completed, cancelled, and on hold projects
        const projectStatus = (project.status || '').toLowerCase();
        if (projectStatus === 'completed' || projectStatus === 'cancelled' || projectStatus === 'on hold') {
          return;
        }
        
        if (projectHoursMap.has(project.id)) {
          const existing = projectHoursMap.get(project.id)!;
          existing.hours += hours;
        } else {
          projectHoursMap.set(project.id, {
            name: project.name,
            hours,
            status: project.status || 'active',
            deadline: project.deadline,
          });
        }
      }
    });

    // Convert to array and calculate deadline proximity score
    const now = new Date();
    const projects = Array.from(projectHoursMap.entries())
      .map(([id, data]) => {
        // Calculate deadline proximity: projects near deadline get higher priority
        let deadlinePriority = 0; // Higher number = higher priority (appears first)
        
        if (data.deadline) {
          const deadlineDate = new Date(data.deadline);
          const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Projects with deadline in next 7 days get high priority
          if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
            // Closer to deadline = higher priority (inverse: 7 days = priority 7, 0 days = priority 14)
            deadlinePriority = 100 - daysUntilDeadline; // 93 to 100
          } else if (daysUntilDeadline < 0) {
            // Overdue projects get highest priority
            deadlinePriority = 200 - Math.abs(daysUntilDeadline); // Very high priority
          }
          // Projects with deadline > 7 days get priority 0 (sorted by hours only)
        }
        
        return {
          id,
          name: data.name,
          hours: Math.round(data.hours * 10) / 10,
          status: this.getProjectStatus(data.status, data.deadline),
          deadline: data.deadline,
          deadlinePriority,
        };
      })
      .sort((a, b) => {
        // First sort by deadline priority (higher priority first)
        if (b.deadlinePriority !== a.deadlinePriority) {
          return b.deadlinePriority - a.deadlinePriority;
        }
        // If same deadline priority, sort by hours (most hours first)
        return b.hours - a.hours;
      })
      .slice(0, limit)
      .map(({ deadlinePriority, ...project }) => project); // Remove deadlinePriority from final result

    return projects;
  }

  async getDailyHoursLast30Days(filters?: AdminFilters): Promise<DailyHoursData[]> {
    let endDate = new Date();
    let startDate = new Date();
    
    // Get date range from filters
    if (filters?.startDate && filters?.endDate) {
      // Use explicit dates from filters - convert to UTC dates
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      // Get UTC date parts to create pure UTC dates
      startDate = new Date(Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      ));
      endDate = new Date(Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
      ));
    } else if (filters?.dateRange || filters?.reportingPeriod) {
      // Use date range from filters
      const dateRange = this.getDateRange(filters);
      // Convert to UTC dates to match database
      startDate = new Date(Date.UTC(
        dateRange.start.getFullYear(),
        dateRange.start.getMonth(),
        dateRange.start.getDate()
      ));
      endDate = new Date(Date.UTC(
        dateRange.end.getFullYear(),
        dateRange.end.getMonth(),
        dateRange.end.getDate()
      ));
    } else {
      // Default: last 30 days in UTC
      endDate = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      ));
      startDate = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() - 30
      ));
    }
    
    // Calculate actual number of days in range (limit to 30 for chart display)
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const displayDays = Math.min(daysDiff, 30);
    
    // If range is longer than 30 days, show the last 30 days
    let queryStartDate = startDate;
    if (daysDiff > 30) {
      queryStartDate = new Date(endDate);
      queryStartDate.setDate(queryStartDate.getDate() - 29); // 30 days including end date
      queryStartDate.setUTCHours(0, 0, 0, 0);
    } else {
      // Ensure proper time boundaries using UTC to match database
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);
      queryStartDate = startDate;
    }
    
    // Ensure endDate uses UTC as well
    const queryEndDate = new Date(endDate);
    queryEndDate.setUTCHours(23, 59, 59, 999);

    let worklogsQuery = supabase
      .from('work_logs')
      .select(`
        hours,
        created_at,
        task_id,
        project_id,
        tasks(
          type,
          category
        )
      `)
      .gte('created_at', queryStartDate.toISOString())
      .lte('created_at', queryEndDate.toISOString())
      .order('created_at', { ascending: true });

    // Apply filters
    if (filters?.projectId) {
      worklogsQuery = worklogsQuery.eq('project_id', filters.projectId);
    }

    const { data: worklogs, error } = await worklogsQuery;

    if (error) throw error;

    // Filter by department if specified (filter by task category in post-processing)
    let filteredWorklogs = worklogs;
    if (filters?.department && filters.department !== 'all') {
      const category = filters.department === 'design' ? 'design' : 'development';
      filteredWorklogs = worklogs?.filter((log) => {
        const task = log.tasks as any;
        return Array.isArray(task) ? task.some((t: any) => t?.category === category) : task?.category === category;
      });
    }

    // Aggregate by date with billable/non-billable breakdown
    const dailyHoursMap = new Map<string, { total: number; billable: number; nonBillable: number }>();

    filteredWorklogs?.forEach((log) => {
      // Extract date directly from ISO string to avoid timezone conversion issues
      // The created_at is in UTC, so we extract YYYY-MM-DD directly from the string
      const isoString = log.created_at;
      const dateKey = isoString.split('T')[0]; // Extract YYYY-MM-DD from UTC ISO string
      
      // Parse hours using utility function
      const hours = parseHours(log.hours);
      
      // Determine if billable based on task type
      const taskType = (log.tasks as any)?.type || '';
      const isBillable = taskType === 'billable' || taskType === 'Billable';
      
      if (dailyHoursMap.has(dateKey)) {
        const entry = dailyHoursMap.get(dateKey)!;
        entry.total += hours;
        if (isBillable) {
          entry.billable += hours;
        } else {
          entry.nonBillable += hours;
        }
      } else {
        dailyHoursMap.set(dateKey, {
          total: hours,
          billable: isBillable ? hours : 0,
          nonBillable: isBillable ? 0 : hours,
        });
      }
    });

    // Convert to array and fill missing dates with 0
    const result: DailyHoursData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Use queryStartDate for generating display dates to match query range
    // Work with UTC dates to avoid timezone shifts
    const displayStartDate = new Date(queryStartDate);
    
    for (let i = 0; i < displayDays; i++) {
      // Create date by adding days in UTC to avoid timezone issues
      const dateUTC = new Date(Date.UTC(
        displayStartDate.getUTCFullYear(),
        displayStartDate.getUTCMonth(),
        displayStartDate.getUTCDate() + i
      ));
      
      // Extract date key in YYYY-MM-DD format from UTC date
      const year = dateUTC.getUTCFullYear();
      const month = String(dateUTC.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateUTC.getUTCDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      // Use UTC values for display to match database dates
      const dayOfMonth = dateUTC.getUTCDate();
      const monthIndex = dateUTC.getUTCMonth();
      const fullYear = dateUTC.getUTCFullYear();
      const dayOfWeek = dateUTC.getUTCDay();
      
      const dayData = dailyHoursMap.get(dateKey) || { total: 0, billable: 0, nonBillable: 0 };
      
      result.push({
        date: dayOfMonth.toString(),
        hours: Math.round(dayData.total * 10) / 10,
        billableHours: Math.round(dayData.billable * 10) / 10,
        nonBillableHours: Math.round(dayData.nonBillable * 10) / 10,
        fullDate: dateKey,
        formattedDate: `${dayNames[dayOfWeek]}, ${monthNames[monthIndex]} ${dayOfMonth}, ${fullYear}`,
      });
    }

    return result;
  }

  private getProjectStatus(status: string, deadline: string | null): 'on-track' | 'at-risk' | 'overdue' {
    if (!deadline) return 'on-track';
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (deadlineDate < now) {
      return 'overdue';
    } else if (daysUntilDeadline <= 7) {
      return 'at-risk';
    } else {
      return 'on-track';
    }
  }
}

export const adminService = new AdminService();

