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

export interface VendorBusinessStats {
  vendor_id: string;
  vendor_name: string;
  total_projects: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin_percent: number | null;
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
   * Get business statistics for all vendors
   */
  async getVendorBusinessStats(): Promise<VendorBusinessStats[]> {
    // Get all vendors
    const vendors = await this.getVendors();

    // Get all projects with vendor_id
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, vendor_id, name');

    if (projectsError) throw projectsError;

    // Get profit data for all projects
    const { data: profitData, error: profitError } = await supabase
      .from('project_profit')
      .select('project_id, project_revenue, project_total_cost, profit, profit_margin_percent');

    if (profitError) {
      console.error('Error fetching profit data:', profitError);
      // Continue with empty profit data
    }

    // Create a map of project_id to profit data
    const profitMap = new Map<string, any>();
    (profitData || []).forEach((profit: any) => {
      profitMap.set(profit.project_id, profit);
    });

    // Group projects by vendor and calculate stats
    const vendorStatsMap = new Map<string, VendorBusinessStats>();

    // Initialize stats for all vendors
    vendors.forEach((vendor) => {
      vendorStatsMap.set(vendor.id, {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        total_projects: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        profit_margin_percent: null,
      });
    });

    // Aggregate data from projects
    (projectsData || []).forEach((project: any) => {
      if (!project.vendor_id) return;

      const stats = vendorStatsMap.get(project.vendor_id);
      if (!stats) return;

      stats.total_projects += 1;

      const profit = profitMap.get(project.id);
      if (profit) {
        stats.total_revenue += Number(profit.project_revenue || 0);
        stats.total_cost += Number(profit.project_total_cost || 0);
        stats.total_profit += Number(profit.profit || 0);
      }
    });

    // Calculate profit margin for each vendor
    vendorStatsMap.forEach((stats) => {
      if (stats.total_revenue > 0) {
        stats.profit_margin_percent = Number(
          ((stats.total_profit / stats.total_revenue) * 100).toFixed(2)
        );
      }
    });

    // Convert to array and sort by total revenue descending
    return Array.from(vendorStatsMap.values()).sort(
      (a, b) => b.total_revenue - a.total_revenue
    );
  }

  /**
   * Get business statistics for a single vendor
   */
  async getVendorBusinessStatsById(vendorId: string): Promise<VendorBusinessStats | null> {
    const allStats = await this.getVendorBusinessStats();
    return allStats.find((stats) => stats.vendor_id === vendorId) || null;
  }
}

export const vendorService = new VendorService();


