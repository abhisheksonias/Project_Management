import { supabase } from '@/integrations/supabase/client';

export interface Milestone {
  id: string;
  name: string;
  project_id: string;
  amount: number;
  currency: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateMilestoneData {
  name: string;
  project_id: string;
  amount: number;
  currency?: string;
  sort_order?: number | null;
}

export interface UpdateMilestoneData {
  name?: string;
  amount?: number;
  currency?: string;
  sort_order?: number | null;
}

class MilestoneService {
  async getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching milestones:', error);
      throw error;
    }
    return (data as Milestone[]) || [];
  }

  async getAllMilestones(): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all milestones:', error);
      throw error;
    }
    return (data as Milestone[]) || [];
  }

  async getMilestoneById(id: string): Promise<Milestone | null> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching milestone:', error);
      throw error;
    }
    return data as Milestone;
  }

  async createMilestone(milestone: CreateMilestoneData): Promise<Milestone> {
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        name: milestone.name,
        project_id: milestone.project_id,
        amount: milestone.amount,
        currency: milestone.currency || 'INR',
        sort_order: milestone.sort_order ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Milestone;
  }

  async updateMilestone(id: string, updates: UpdateMilestoneData): Promise<Milestone> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.currency !== undefined) updatePayload.currency = updates.currency;
    if (updates.sort_order !== undefined) updatePayload.sort_order = updates.sort_order;

    const { data, error } = await supabase
      .from('milestones')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Milestone;
  }

  async deleteMilestone(id: string): Promise<void> {
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const milestoneService = new MilestoneService();

