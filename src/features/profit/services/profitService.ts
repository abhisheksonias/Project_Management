import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface ProjectProfitOverall {
  project_id: string;
  project_name: string;
  project_revenue: number;
  project_total_cost: number;
  profit: number;
  profit_margin_percent: number | null;
}

export interface ProjectRevenueMonthly {
  project_id: string;
  month_start: string;
  hourly_revenue: number;
  fixed_revenue: number;
  project_revenue_month: number;
}

export interface ProjectMonthCosts {
  project_id: string;
  month_start: string;
  project_cost_for_month: number;
}

export interface ProjectMonthlyProfit {
  month_start: string;
  revenue: number;
  cost: number;
  profit: number;
  profit_margin: number | null;
}

export interface ProjectUserCost {
  user_id: string;
  user_name: string;
  total_user_cost: number;
}

export interface CompanyProfitMonthly {
  month_start: string;
  company_revenue: number;
  company_cost: number;
  profit: number;
  profit_margin_percent: number | null;
}

class ProfitService {
  /**
   * Get overall profit for all projects
   */
  async getProjectProfitOverall(): Promise<ProjectProfitOverall[]> {
    const { data, error } = await supabase
      .from('project_profit_overall')
      .select('*')
      .order('profit', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      project_id: row.project_id,
      project_name: row.project_name,
      project_revenue: parseFloat(row.project_revenue || 0),
      project_total_cost: parseFloat(row.project_total_cost || 0),
      profit: parseFloat(row.profit || 0),
      profit_margin_percent: row.profit_margin_percent ? parseFloat(row.profit_margin_percent) : null,
    }));
  }

  /**
   * Get monthly revenue for a specific project
   */
  async getProjectRevenueMonthly(projectId: string): Promise<ProjectRevenueMonthly[]> {
    const { data, error } = await supabase
      .from('project_revenue_monthly')
      .select('*')
      .eq('project_id', projectId)
      .order('month_start', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => ({
      project_id: row.project_id,
      month_start: row.month_start,
      hourly_revenue: parseFloat(row.hourly_revenue || 0),
      fixed_revenue: parseFloat(row.fixed_revenue || 0),
      project_revenue_month: parseFloat(row.project_revenue_month || 0),
    }));
  }

  /**
   * Get monthly costs for a specific project
   */
  async getProjectMonthCosts(projectId: string): Promise<ProjectMonthCosts[]> {
    const { data, error } = await supabase
      .from('project_month_costs')
      .select('*')
      .eq('project_id', projectId)
      .order('month_start', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => ({
      project_id: row.project_id,
      month_start: row.month_start,
      project_cost_for_month: parseFloat(row.project_cost_for_month || 0),
    }));
  }

  /**
   * Get combined monthly profit data (revenue - cost) for a project
   */
  async getProjectMonthlyProfit(projectId: string): Promise<ProjectMonthlyProfit[]> {
    const [revenueData, costData] = await Promise.all([
      this.getProjectRevenueMonthly(projectId),
      this.getProjectMonthCosts(projectId),
    ]);

    // Create a map of all unique months
    const monthMap = new Map<string, { revenue: number; cost: number }>();

    // Add revenue data
    revenueData.forEach((row) => {
      monthMap.set(row.month_start, {
        revenue: row.project_revenue_month,
        cost: 0,
      });
    });

    // Add/update cost data
    costData.forEach((row) => {
      const existing = monthMap.get(row.month_start);
      if (existing) {
        existing.cost = row.project_cost_for_month;
      } else {
        monthMap.set(row.month_start, {
          revenue: 0,
          cost: row.project_cost_for_month,
        });
      }
    });

    // Convert to array and calculate profit
    return Array.from(monthMap.entries())
      .map(([month_start, data]) => {
        const profit = data.revenue - data.cost;
        const profit_margin = data.revenue > 0 ? (profit / data.revenue) * 100 : null;

        return {
          month_start: format(new Date(month_start), 'MMM yyyy'),
          revenue: data.revenue,
          cost: data.cost,
          profit,
          profit_margin: profit_margin !== null ? parseFloat(profit_margin.toFixed(2)) : null,
        };
      })
      .sort((a, b) => new Date(a.month_start).getTime() - new Date(b.month_start).getTime());
  }

  /**
   * Get overall profit for a specific project
   */
  async getProjectProfitById(projectId: string): Promise<ProjectProfitOverall | null> {
    const { data, error } = await supabase
      .from('project_profit_overall')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    if (!data) return null;

    return {
      project_id: data.project_id,
      project_name: data.project_name,
      project_revenue: parseFloat(data.project_revenue || 0),
      project_total_cost: parseFloat(data.project_total_cost || 0),
      profit: parseFloat(data.profit || 0),
      profit_margin_percent: data.profit_margin_percent ? parseFloat(data.profit_margin_percent) : null,
    };
  }

  /**
   * Get cost per user for a specific project
   */
  async getProjectUserCosts(projectId: string): Promise<ProjectUserCost[]> {
    const { data, error } = await supabase
      .from('project_user_costs')
      .select('user_id, total_user_cost, users!inner(id, name)')
      .eq('project_id', projectId)
      .order('total_user_cost', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      user_id: row.user_id,
      user_name: (row.users as any)?.name || 'Unknown User',
      total_user_cost: parseFloat(row.total_user_cost || 0),
    }));
  }

  /**
   * Get monthly company profit data
   */
  async getCompanyProfitMonthly(): Promise<CompanyProfitMonthly[]> {
    const { data, error } = await supabase
      .from('company_profit_monthly')
      .select('*')
      .order('month_start', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      month_start: row.month_start,
      company_revenue: parseFloat(row.company_revenue || 0),
      company_cost: parseFloat(row.company_cost || 0),
      profit: parseFloat(row.profit || 0),
      profit_margin_percent: row.profit_margin_percent ? parseFloat(row.profit_margin_percent) : null,
    }));
  }
}

export const profitService = new ProfitService();

