import { supabase } from '@/integrations/supabase/client';

export interface ChangeRequest {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: 'design' | 'development';
  attachment_urls?: string[] | null;
  reference_links?: string[] | null;
  status: 'open' | 'accepted' | 'in_progress' | 'review' | 'completed' | 'in_review' | 'approved' | 'rejected' | 'converted';
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

class ChangeRequestService {
  async createChangeRequest(
    projectId: string,
    payload: {
      title: string;
      description: string;
      category: 'design' | 'development';
      files?: File[]; // client File objects
      reference_links?: string[];
      created_by?: string | null;
    }
  ): Promise<ChangeRequest> {
    const attachmentUrls: string[] = [];

    if (payload.files && payload.files.length > 0) {
      for (const file of payload.files) {
        // Enforce 5MB limit
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 5MB limit`);
        }

        const filePath = `projects/${projectId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('change-request-media')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('change-request-media').getPublicUrl(filePath);
        if (data && data.publicUrl) {
          attachmentUrls.push(data.publicUrl);
        }
      }
    }

    const { data, error } = await (supabase as any)
      .from('change_requests')
      .insert({
        project_id: projectId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        attachment_urls: attachmentUrls.length ? attachmentUrls : null,
        reference_links: payload.reference_links ?? null,
        created_by: payload.created_by ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as ChangeRequest;
  }

  async listByProject(projectId: string): Promise<ChangeRequest[]> {
    const { data, error } = await (supabase as any)
      .from('change_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ChangeRequest[];
  }

  async getById(id: string): Promise<ChangeRequest | null> {
    const { data, error } = await (supabase as any)
      .from('change_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ChangeRequest;
  }

  async markConverted(id: string, createdTaskId?: string): Promise<void> {
    const updates: any = { status: 'converted', updated_at: new Date().toISOString() };
    if (createdTaskId) {
      updates['converted_task_id'] = createdTaskId;
    }

    const { error } = await (supabase as any)
      .from('change_requests')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }
}

export const changeRequestService = new ChangeRequestService();

