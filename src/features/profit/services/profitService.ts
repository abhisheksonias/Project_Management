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
   */
  async getUserProjectProfit(projectId: string): Promise<UserProjectProfit[]> {
    // Fetch user profit data from view
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

