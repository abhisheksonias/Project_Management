import { supabase } from '@/integrations/supabase/client';

export interface ProjectProfit {
  project_id: string;
  name: string;
  project_revenue: number;
  project_total_cost: number;
  profit: number;
  profit_margin_percent: number | null;
  total_hours?: number;
  status?: string | null;
}

export interface UserProjectProfit {
  user_id: string;
  project_id: string;
  user_hours: number;
  project_revenue: number;
  user_revenue_share: number;
  user_cost: number;
  user_profit: number;
  user_name?: string;
}

export interface ProjectProfitParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string | null;
}

export interface ProjectProfitResponse {
  data: ProjectProfit[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MonthlyProfitTrend {
  month: string; // Format: "YYYY-MM"
  monthLabel: string; // Format: "Jan 2025"
  revenue: number;
  cost: number;
  profit: number;
}

class ProfitService {
  /**
   * Get paginated projects with profit data
   */
  async getProjectsProfit(params: ProjectProfitParams = {}): Promise<ProjectProfitResponse> {
    const { page = 1, pageSize = 20, search = '', status = null } = params;
    
    // Build query for project_profit view
    let query = supabase
      .from('project_profit')
      .select('project_id, name, project_revenue, project_total_cost, profit, profit_margin_percent');

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Fetch all data first (we'll filter and paginate client-side due to joined table)
    const { data: profitData, error: profitError } = await query
      .order('name', { ascending: true });

    if (profitError) throw profitError;

    // Get project IDs to fetch status and hours
    const allProjectIds = (profitData || []).map((p: any) => p.project_id);
    
    // Fetch project statuses
    let projectsData: any[] = [];
    if (allProjectIds.length > 0) {
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status')
        .in('id', allProjectIds);

      if (projectsError) {
        console.error('Error fetching project statuses:', projectsError);
      } else {
        projectsData = projects || [];
      }
    }

    // Get total hours for all projects
    let hoursData: any[] = [];
    if (allProjectIds.length > 0) {
      const { data: hours, error: hoursError } = await supabase
        .from('project_total_hours')
        .select('project_id, total_hours')
        .in('project_id', allProjectIds);

      if (hoursError) {
        console.error('Error fetching project hours:', hoursError);
      } else {
        hoursData = hours || [];
      }
    }

    // Combine profit data with hours and status
    let combinedData: ProjectProfit[] = (profitData || []).map((p: any) => {
      const hours = hoursData.find((h) => h.project_id === p.project_id);
      const project = projectsData.find((pr) => pr.id === p.project_id);
      return {
        project_id: p.project_id,
        name: p.name,
        project_revenue: p.project_revenue,
        project_total_cost: p.project_total_cost,
        profit: p.profit,
        profit_margin_percent: p.profit_margin_percent,
        total_hours: hours?.total_hours || 0,
        status: project?.status || null,
      };
    });

    // Apply status filter
    if (status && status !== 'All') {
      combinedData = combinedData.filter((p) => {
        const projectStatus = (p.status || '').toLowerCase();
        if (status === 'Active') {
          return projectStatus !== 'completed' && projectStatus !== 'on hold';
        } else if (status === 'Completed') {
          return projectStatus === 'completed';
        }
        return true;
      });
    }

    // Get total after filtering
    const filteredTotal = combinedData.length;

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedData = combinedData.slice(from, to);

    return {
      data: paginatedData,
      total: filteredTotal,
      page,
      pageSize,
    };
  }

  /**
   * Get user profit breakdown for a specific project
   * @param projectId - Project ID
   * @param month - Optional month filter (if provided, calculates profit for that month only)
   */
  async getUserProjectProfit(projectId: string, month?: Date): Promise<UserProjectProfit[]> {
    // If month is provided, calculate month-wise profit
    if (month) {
      return this.getUserProjectProfitForMonth(projectId, month);
    }

    // Fetch user profit data from view (overall)
    const { data: profitData, error: profitError } = await supabase
      .from('user_project_profit')
      .select('user_id, project_id, user_hours, project_revenue, user_revenue_share, user_cost, user_profit')
      .eq('project_id', projectId)
      .order('user_hours', { ascending: false });

    if (profitError) throw profitError;

    if (!profitData || profitData.length === 0) {
      return [];
    }

    // Fetch user names separately
    const userIds = profitData.map((item) => item.user_id);
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    // Create a map of user_id to user name
    const usersMap = new Map<string, string>();
    (usersData || []).forEach((user: any) => {
      usersMap.set(user.id, user.name);
    });

    // Combine profit data with user names
    return profitData.map((item) => ({
      user_id: item.user_id,
      project_id: item.project_id,
      user_hours: item.user_hours,
      project_revenue: item.project_revenue,
      user_revenue_share: item.user_revenue_share,
      user_cost: item.user_cost,
      user_profit: item.user_profit,
      user_name: usersMap.get(item.user_id) || 'Unknown User',
    }));
  }

  /**
   * Get user profit breakdown for a specific project for a given month
   */
  private async getUserProjectProfitForMonth(projectId: string, month: Date): Promise<UserProjectProfit[]> {
    // Calculate start and end of month
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    endDate.setUTCHours(23, 59, 59, 999);

    // Fetch worklogs for this project in the given month
    // Worklogs can have project_id directly OR through tasks
    // First get all tasks for this project
    const { data: projectTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId);

    if (tasksError) {
      console.error('Error fetching project tasks:', tasksError);
      throw tasksError;
    }

    const taskIds = (projectTasks || []).map((t: any) => t.id);

    // Fetch worklogs - check both direct project_id and through tasks
    // First, get worklogs with direct project_id
    const { data: directWorklogs, error: directError } = await supabase
      .from('work_logs')
      .select('id, user_id, hours_num, task_id, project_id')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('user_id', 'is', null);

    if (directError) {
      console.error('Error fetching direct worklogs:', directError);
      throw directError;
    }

    // Then, get worklogs through tasks
    let taskWorklogs: any[] = [];
    if (taskIds.length > 0) {
      const { data: taskWl, error: taskError } = await supabase
        .from('work_logs')
        .select('id, user_id, hours_num, task_id, project_id')
        .in('task_id', taskIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('user_id', 'is', null);

      if (taskError) {
        console.error('Error fetching task worklogs:', taskError);
        // Don't throw, just log - we'll use direct worklogs only
      } else {
        taskWorklogs = taskWl || [];
      }
    }

    // Combine and deduplicate worklogs (in case a worklog matches both)
    const worklogMap = new Map<string, any>();
    (directWorklogs || []).forEach((wl: any) => {
      if (wl.id) worklogMap.set(wl.id, wl);
    });
    taskWorklogs.forEach((wl: any) => {
      if (wl.id && !worklogMap.has(wl.id)) {
        worklogMap.set(wl.id, wl);
      }
    });

    const projectWorklogs = Array.from(worklogMap.values());

    // Calculate user hours for the month
    const userHoursMap = new Map<string, number>();
    projectWorklogs.forEach((wl: any) => {
      if (!wl.user_id) return; // Skip if no user_id
      const hours = typeof wl.hours_num === 'number' ? wl.hours_num : Number(wl.hours_num) || 0;
      if (hours > 0) {
        const currentHours = userHoursMap.get(wl.user_id) || 0;
        userHoursMap.set(wl.user_id, currentHours + hours);
      }
    });

    if (userHoursMap.size === 0) {
      return [];
    }

    // Calculate ACTUAL revenue for this month based on milestones worked in this month
    // Get all milestones for this project
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, project_id, is_hourly, amount, hourly_rate')
      .eq('project_id', projectId);

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
      throw milestonesError;
    }

    let monthRevenue = 0;
    const milestoneIds = (milestones || []).map((m: any) => m.id);

    if (milestoneIds.length > 0) {
      // Get worklogs for milestones in this month
      const { data: milestoneWorklogs, error: mwlError } = await supabase
        .from('work_logs')
        .select('task_id, hours_num, tasks!inner(milestone_id)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('tasks.milestone_id', milestoneIds);

      if (mwlError) {
        console.error('Error fetching milestone worklogs:', mwlError);
      } else if (milestoneWorklogs) {
        // Calculate hours per milestone in this month
        const milestoneHoursMap = new Map<string, number>();
        milestoneWorklogs.forEach((wl: any) => {
          const task = Array.isArray(wl.tasks) ? wl.tasks[0] : wl.tasks;
          const milestoneId = task?.milestone_id;
          if (milestoneId) {
            const hours = typeof wl.hours_num === 'number' ? wl.hours_num : Number(wl.hours_num) || 0;
            const currentHours = milestoneHoursMap.get(milestoneId) || 0;
            milestoneHoursMap.set(milestoneId, currentHours + hours);
          }
        });

        // Calculate revenue for each milestone based on hours worked in this month
        // First, get total hours logged for each milestone (across all time) to calculate proportion for fixed milestones
        const { data: allMilestoneWorklogs, error: allMwlError } = await supabase
          .from('work_logs')
          .select('task_id, hours_num, tasks!inner(milestone_id)')
          .in('tasks.milestone_id', milestoneIds);

        const allMilestoneHoursMap = new Map<string, number>();
        if (!allMwlError && allMilestoneWorklogs) {
          allMilestoneWorklogs.forEach((wl: any) => {
            const task = Array.isArray(wl.tasks) ? wl.tasks[0] : wl.tasks;
            const milestoneId = task?.milestone_id;
            if (milestoneId) {
              const hours = typeof wl.hours_num === 'number' ? wl.hours_num : Number(wl.hours_num) || 0;
              const currentHours = allMilestoneHoursMap.get(milestoneId) || 0;
              allMilestoneHoursMap.set(milestoneId, currentHours + hours);
            }
          });
        }

        (milestones || []).forEach((m: any) => {
          const monthHours = milestoneHoursMap.get(m.id) || 0;
          if (m.is_hourly) {
            // For hourly milestones, revenue = hours worked in month * hourly_rate
            monthRevenue += monthHours * (m.hourly_rate || 0);
          } else {
            // For fixed amount milestones, calculate proportional revenue based on hours
            const totalMilestoneHours = allMilestoneHoursMap.get(m.id) || 0;
            if (monthHours > 0 && totalMilestoneHours > 0) {
              // Proportional: (month hours / total milestone hours) * milestone amount
              const proportionalAmount = (monthHours / totalMilestoneHours) * (m.amount || 0);
              monthRevenue += proportionalAmount;
            } else if (monthHours > 0 && totalMilestoneHours === 0) {
              // If this is the first work on milestone, include full amount
              monthRevenue += m.amount || 0;
            }
          }
        });
      }
    }

    const monthTotalHours = Array.from(userHoursMap.values()).reduce((sum, hours) => sum + hours, 0);

    // Get user costs and names
    const userIds = Array.from(userHoursMap.keys());
    
    if (userIds.length === 0) {
      return [];
    }

    // Fetch user names
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    const usersMap = new Map<string, { name: string; hourlyCost: number }>();
    (usersData || []).forEach((user: any) => {
      if (user && user.id) {
        usersMap.set(user.id, {
          name: user.name || 'Unknown User',
          hourlyCost: 0, // Will be calculated below
        });
      }
    });

    // Fetch user costs for this month using the hourly_cost_for_user_month function
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Fetch hourly costs for all users in parallel
    const costPromises = userIds.map(async (userId) => {
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          name: 'Unknown User',
          hourlyCost: 0,
        });
      }

      // Get hourly cost for this user for this month
      const { data: costData, error: costError } = await supabase
        .rpc('hourly_cost_for_user_month', {
          p_user_id: userId,
          p_month_date: monthStartStr,
        });

      if (!costError && costData && costData.length > 0) {
        const hourlyCost = costData[0].hourly_cost;
        const user = usersMap.get(userId);
        if (user) {
          user.hourlyCost = typeof hourlyCost === 'number' ? hourlyCost : Number(hourlyCost) || 0;
        }
      }
      return { userId, hourlyCost: usersMap.get(userId)?.hourlyCost || 0 };
    });

    await Promise.all(costPromises);

    // Calculate user revenue share and profit for the month
    const result: UserProjectProfit[] = [];
    userHoursMap.forEach((hours, userId) => {
      const user = usersMap.get(userId) || { name: 'Unknown User', hourlyCost: 0 };
      const userRevenueShare = monthTotalHours > 0 
        ? (monthRevenue * hours) / monthTotalHours 
        : 0;
      const userCost = hours * user.hourlyCost;
      const userProfit = userRevenueShare - userCost;

      result.push({
        user_id: userId,
        project_id: projectId,
        user_hours: hours,
        project_revenue: monthRevenue,
        user_revenue_share: userRevenueShare,
        user_cost: userCost,
        user_profit: userProfit,
        user_name: user.name,
      });
    });

    // Sort by hours descending
    return result.sort((a, b) => b.user_hours - a.user_hours);
  }

  /**
   * Get monthly profit trend for a project (last N months, excluding current month)
   */
  async getProjectMonthlyTrend(projectId: string, months: number = 6): Promise<MonthlyProfitTrend[]> {
    const result: MonthlyProfitTrend[] = [];
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get data for last N months, excluding current month
    // Start from 1 month ago (i=1) to exclude current month
    for (let i = months; i >= 1; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      
      // Skip if this is the current month (shouldn't happen with i >= 1, but safety check)
      if (monthDate.getTime() >= currentMonth.getTime()) {
        continue;
      }
      
      // Get user profit data for this month (reuse existing method)
      const monthData = await this.getUserProjectProfitForMonth(projectId, monthDate);

      // Calculate totals for this month
      const revenue = monthData.length > 0 
        ? monthData[0].project_revenue || 0 
        : 0;
      const cost = monthData.reduce((sum, user) => sum + (user.user_cost || 0), 0);
      const profit = revenue - cost;

      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      result.push({
        month: monthKey,
        monthLabel,
        revenue,
        cost,
        profit,
      });
    }

    return result;
  }

  /**
   * Get project cost per month (excluding current month)
   */
  async getProjectCostPerMonth(projectId: string, months: number = 6): Promise<MonthlyProfitTrend[]> {
    const result: MonthlyProfitTrend[] = [];
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get data for last N months, excluding current month
    for (let i = months; i >= 1; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      
      // Skip if this is the current month
      if (monthDate.getTime() >= currentMonth.getTime()) {
        continue;
      }
      
      // Get user profit data for this month to calculate cost
      const monthData = await this.getUserProjectProfitForMonth(projectId, monthDate);

      // Calculate cost for this month (sum of all user costs)
      const cost = monthData.reduce((sum, user) => sum + (user.user_cost || 0), 0);

      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      result.push({
        month: monthKey,
        monthLabel,
        revenue: 0, // Not needed for cost chart
        cost,
        profit: 0, // Not needed for cost chart
      });
    }

    return result;
  }

  /**
   * Get single project profit details
   */
  async getProjectProfit(projectId: string): Promise<ProjectProfit | null> {
    const { data, error } = await supabase
      .from('project_profit')
      .select('project_id, name, project_revenue, project_total_cost, profit, profit_margin_percent')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Get total hours
    const { data: hoursData } = await supabase
      .from('project_total_hours')
      .select('total_hours')
      .eq('project_id', projectId)
      .single();

    return {
      ...data,
      total_hours: hoursData?.total_hours || 0,
    };
  }
}

export const profitService = new ProfitService();

