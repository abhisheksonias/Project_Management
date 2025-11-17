import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval } from 'date-fns';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  projectId?: string;
  billableType?: 'all' | 'billable' | 'non-billable';
}

export interface WorklogWithDetails {
  id: string;
  hours: number;
  created_at: string;
  task_id: string | null;
  tasks?: {
    name: string;
    type: string | null;
    status: string;
    estimate_hours: number | null;
    project_id: string | null;
  };
  projects?: {
    id: string;
    name: string;
    type: string | null;
  };
}

export interface ReportStats {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billablePercentage: number;
  tasksCompleted: number;
  projectsContributed: number;
}

export interface HoursOverTime {
  date: string;
  hours: number;
}

export interface HoursByProject {
  projectName: string;
  hours: number;
}

export interface EstimateVsLogged {
  taskName: string;
  projectName: string;
  estimate: number;
  logged: number;
  variance: number;
}

export interface Insights {
  topFocusProject: string;
  biggestOverEstimate: string;
  biggestUnderEstimate: string;
  activeDays: number;
}

class ReportService {
  async getWorklogsWithDetails(userId: string, filters: ReportFilters): Promise<WorklogWithDetails[]> {
    let query = supabase
      .from('work_logs')
      .select(`
        id,
        hours,
        created_at,
        task_id,
        tasks(
          name,
          type,
          status,
          estimate_hours,
          project_id
        ),
        projects(
          id,
          name,
          type
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', filters.startDate.toISOString())
      .lte('created_at', filters.endDate.toISOString())
      .order('created_at', { ascending: true });

    // Apply project filter
    if (filters.projectId && filters.projectId !== 'all') {
      query = query.eq('projects.id', filters.projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Apply billable type filter
    let worklogs = (data as any[]) || [];
    if (filters.billableType === 'billable') {
      worklogs = worklogs.filter((w) => w.tasks?.type === 'billable');
    } else if (filters.billableType === 'non-billable') {
      worklogs = worklogs.filter((w) => w.tasks?.type === 'non-billable');
    }

    // Convert hours to numbers
    return worklogs.map((w) => ({
      ...w,
      hours: parseFloat(w.hours) || 0,
    })) as WorklogWithDetails[];
  }

  async getTasksWithEstimates(userId: string, filters: ReportFilters): Promise<any[]> {
    // First, get task IDs assigned to the user via task_assignees table
    const { data: assigneesData, error: assigneesError } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', userId);

    if (assigneesError) throw assigneesError;

    const taskIds = assigneesData?.map((a) => a.task_id) || [];
    
    if (taskIds.length === 0) return [];

    let query = supabase
      .from('tasks')
      .select(`
        id,
        name,
        estimate_hours,
        status,
        project_id,
        projects(
          id,
          name
        )
      `)
      .in('id', taskIds);

    // Apply project filter
    if (filters.projectId && filters.projectId !== 'all') {
      query = query.eq('project_id', filters.projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data as any[]) || [];
  }

  async getReportData(userId: string, filters: ReportFilters) {
    const worklogs = await this.getWorklogsWithDetails(userId, filters);
    const tasks = await this.getTasksWithEstimates(userId, filters);

    // Calculate stats
    const stats = this.calculateStats(worklogs, tasks);
    
    // Calculate hours over time
    const hoursOverTime = this.calculateHoursOverTime(worklogs, filters);
    
    // Calculate hours by project
    const hoursByProject = this.calculateHoursByProject(worklogs);
    
    // Calculate estimate vs logged
    const estimateVsLogged = this.calculateEstimateVsLogged(worklogs, tasks);
    
    // Calculate insights
    const insights = this.calculateInsights(worklogs, tasks, filters);

    return {
      stats,
      hoursOverTime,
      hoursByProject,
      estimateVsLogged,
      insights,
    };
  }

  private calculateStats(worklogs: WorklogWithDetails[], tasks: any[]): ReportStats {
    const totalHours = worklogs.reduce((sum, w) => sum + w.hours, 0);
    
    const billableHours = worklogs
      .filter((w) => w.tasks?.type === 'billable')
      .reduce((sum, w) => sum + w.hours, 0);
    
    const nonBillableHours = totalHours - billableHours;
    const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    // Get unique completed tasks
    const completedTaskIds = new Set(
      tasks
        .filter((t) => t.status === 'Completed')
        .map((t) => t.id)
    );
    
    // Count completed tasks that have worklogs in the date range
    const tasksCompleted = worklogs.filter(
      (w) => w.task_id && completedTaskIds.has(w.task_id)
    ).length;

    // Get unique projects
    const projectsContributed = new Set(
      worklogs
        .filter((w) => w.projects?.id)
        .map((w) => w.projects!.id)
    ).size;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      billableHours: Math.round(billableHours * 10) / 10,
      nonBillableHours: Math.round(nonBillableHours * 10) / 10,
      billablePercentage: Math.round(billablePercentage * 10) / 10,
      tasksCompleted,
      projectsContributed,
    };
  }

  private calculateHoursOverTime(
    worklogs: WorklogWithDetails[],
    filters: ReportFilters
  ): HoursOverTime[] {
    const days = eachDayOfInterval({
      start: filters.startDate,
      end: filters.endDate,
    });

    const hoursByDate = new Map<string, number>();
    
    // Initialize all days with 0
    days.forEach((day) => {
      hoursByDate.set(format(day, 'yyyy-MM-dd'), 0);
    });

    // Sum hours by date
    worklogs.forEach((w) => {
      const date = format(new Date(w.created_at), 'yyyy-MM-dd');
      const current = hoursByDate.get(date) || 0;
      hoursByDate.set(date, current + w.hours);
    });

    // Group by month for display
    const monthlyData = new Map<string, number>();
    days.forEach((day) => {
      const monthKey = format(day, 'MMM');
      const dateKey = format(day, 'yyyy-MM-dd');
      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + (hoursByDate.get(dateKey) || 0));
    });

    return Array.from(monthlyData.entries()).map(([date, hours]) => ({
      date,
      hours: Math.round(hours * 10) / 10,
    }));
  }

  private calculateHoursByProject(worklogs: WorklogWithDetails[]): HoursByProject[] {
    const projectHours = new Map<string, number>();

    worklogs.forEach((w) => {
      const projectName = w.projects?.name || 'No Project';
      const current = projectHours.get(projectName) || 0;
      projectHours.set(projectName, current + w.hours);
    });

    return Array.from(projectHours.entries())
      .map(([projectName, hours]) => ({
        projectName,
        hours: Math.round(hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  private calculateEstimateVsLogged(
    worklogs: WorklogWithDetails[],
    tasks: any[]
  ): EstimateVsLogged[] {
    const taskHours = new Map<string, number>();
    const taskProjects = new Map<string, string>();

    // Sum hours by task
    worklogs.forEach((w) => {
      if (w.task_id) {
        const current = taskHours.get(w.task_id) || 0;
        taskHours.set(w.task_id, current + w.hours);
        if (w.projects?.name) {
          taskProjects.set(w.task_id, w.projects.name);
        }
      }
    });

    // Get estimates and calculate variance
    const results: EstimateVsLogged[] = [];
    
    tasks.forEach((task) => {
      const logged = taskHours.get(task.id) || 0;
      const estimate = task.estimate_hours ? parseFloat(task.estimate_hours) : 0;
      
      if (estimate > 0 || logged > 0) {
        results.push({
          taskName: task.name,
          projectName: taskProjects.get(task.id) || task.projects?.name || 'No Project',
          estimate,
          logged: Math.round(logged * 10) / 10,
          variance: Math.round((logged - estimate) * 10) / 10,
        });
      }
    });

    return results.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 10);
  }

  private calculateInsights(
    worklogs: WorklogWithDetails[],
    tasks: any[],
    filters: ReportFilters
  ): Insights {
    // Top focus project (most hours)
    const projectHours = new Map<string, number>();
    worklogs.forEach((w) => {
      const projectName = w.projects?.name || 'No Project';
      const current = projectHours.get(projectName) || 0;
      projectHours.set(projectName, current + w.hours);
    });
    
    const topFocusProject = Array.from(projectHours.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Biggest over/under estimates
    const taskHours = new Map<string, number>();
    worklogs.forEach((w) => {
      if (w.task_id) {
        const current = taskHours.get(w.task_id) || 0;
        taskHours.set(w.task_id, current + w.hours);
      }
    });

    let biggestOverEstimate = { name: 'N/A', variance: 0 };
    let biggestUnderEstimate = { name: 'N/A', variance: 0 };

    tasks.forEach((task) => {
      const logged = taskHours.get(task.id) || 0;
      const estimate = task.estimate_hours ? parseFloat(task.estimate_hours) : 0;
      const variance = logged - estimate;

      if (variance > biggestOverEstimate.variance) {
        biggestOverEstimate = { name: task.name, variance };
      }
      if (variance < biggestUnderEstimate.variance) {
        biggestUnderEstimate = { name: task.name, variance };
      }
    });

    // Active days (days with at least some work logged)
    const activeDays = new Set(
      worklogs.map((w) => format(new Date(w.created_at), 'yyyy-MM-dd'))
    ).size;

    return {
      topFocusProject,
      biggestOverEstimate: biggestOverEstimate.name !== 'N/A'
        ? `${biggestOverEstimate.name} (+${Math.round(biggestOverEstimate.variance)}h)`
        : 'N/A',
      biggestUnderEstimate: biggestUnderEstimate.name !== 'N/A'
        ? `${biggestUnderEstimate.name} (${Math.round(biggestUnderEstimate.variance)}h)`
        : 'N/A',
      activeDays,
    };
  }
}

export const reportService = new ReportService();

