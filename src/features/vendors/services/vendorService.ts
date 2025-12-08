import { supabase } from '@/integrations/supabase/client';

export interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateVendorInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface UpdateVendorInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface VendorProfit {
  vendor_id: string;
  vendor_name: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin_percent: number | null;
  project_count: number;
}

export interface VendorProject {
  project_id: string;
  project_name: string;
  project_revenue: number;
  project_total_cost: number;
  profit: number;
  profit_margin_percent: number | null;
  status: string | null;
}

class VendorService {
  async getVendors(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  }

  async updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  }

  /**
   * Get profit summary for all vendors
   */
  async getVendorProfits(): Promise<VendorProfit[]> {
    // Get all vendors
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name');

    if (vendorsError) throw vendorsError;

    // Get profit data for all projects
    const { data: projectProfits, error: profitsError } = await supabase
      .from('project_profit_overall')
      .select('project_id, project_name, project_revenue, project_total_cost, profit, profit_margin_percent');

    if (profitsError) throw profitsError;

    // Get projects with vendor_id
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, vendor_id');

    if (projectsError) throw projectsError;

    // Create a map of project_id -> vendor_id
    const projectVendorMap = new Map<string, string>();
    projects?.forEach((project) => {
      if (project.vendor_id) {
        projectVendorMap.set(project.id, project.vendor_id);
      }
    });

    // Create a map of vendor_id -> profit data
    const vendorProfitMap = new Map<string, {
      revenue: number;
      cost: number;
      profit: number;
      projectCount: number;
    }>();

    // Aggregate profits by vendor
    projectProfits?.forEach((projectProfit) => {
      const vendorId = projectVendorMap.get(projectProfit.project_id);
      if (!vendorId) return;

      const existing = vendorProfitMap.get(vendorId) || {
        revenue: 0,
        cost: 0,
        profit: 0,
        projectCount: 0,
      };

      existing.revenue += parseFloat(projectProfit.project_revenue || 0);
      existing.cost += parseFloat(projectProfit.project_total_cost || 0);
      existing.profit += parseFloat(projectProfit.profit || 0);
      existing.projectCount += 1;

      vendorProfitMap.set(vendorId, existing);
    });

    // Convert to array
    return (vendors || []).map((vendor) => {
      const profitData = vendorProfitMap.get(vendor.id) || {
        revenue: 0,
        cost: 0,
        profit: 0,
        projectCount: 0,
      };

      const profitMargin = profitData.revenue > 0
        ? (profitData.profit / profitData.revenue) * 100
        : null;

      return {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        total_revenue: profitData.revenue,
        total_cost: profitData.cost,
        total_profit: profitData.profit,
        profit_margin_percent: profitMargin !== null ? parseFloat(profitMargin.toFixed(2)) : null,
        project_count: profitData.projectCount,
      };
    });
  }

  /**
   * Get projects for a specific vendor with profit data
   */
  async getVendorProjects(vendorId: string): Promise<VendorProject[]> {
    // Get projects for this vendor
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status, vendor_id')
      .eq('vendor_id', vendorId);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) return [];

    const projectIds = projects.map((p) => p.id);

    // Get profit data for these projects
    const { data: projectProfits, error: profitsError } = await supabase
      .from('project_profit_overall')
      .select('project_id, project_name, project_revenue, project_total_cost, profit, profit_margin_percent')
      .in('project_id', projectIds);

    if (profitsError) throw profitsError;

    // Create a map of project_id -> profit data
    const profitMap = new Map<string, any>();
    projectProfits?.forEach((profit) => {
      profitMap.set(profit.project_id, profit);
    });

    // Combine project and profit data
    return projects.map((project) => {
      const profitData = profitMap.get(project.id);
      if (profitData) {
        return {
          project_id: project.id,
          project_name: project.name,
          project_revenue: parseFloat(profitData.project_revenue || 0),
          project_total_cost: parseFloat(profitData.project_total_cost || 0),
          profit: parseFloat(profitData.profit || 0),
          profit_margin_percent: profitData.profit_margin_percent
            ? parseFloat(profitData.profit_margin_percent)
            : null,
          status: project.status,
        };
      }

      // If no profit data, return with zeros
      return {
        project_id: project.id,
        project_name: project.name,
        project_revenue: 0,
        project_total_cost: 0,
        profit: 0,
        profit_margin_percent: null,
        status: project.status,
      };
    });
  }
}

export const vendorService = new VendorService();


