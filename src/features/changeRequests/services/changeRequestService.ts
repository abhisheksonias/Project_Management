import { supabase } from '@/integrations/supabase/client';

export interface ChangeRequest {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: 'design' | 'development';
  attachment_urls?: string[] | null;
  reference_links?: string[] | null;
  status: string;
  request_type?: 'change_request' | 'feedback';
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  comments?: ChangeRequestComment[] | any;
}

export interface ChangeRequestComment {
  id: string;
  message: string;
  user_id: string;
  is_edited: boolean;
  user_name: string;
  created_at: string;
  updated_at: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  mentions?: string[];
}

export type ChangeRequestProjectOption = { id: string; name: string };

class ChangeRequestService {
  /** Projects that have at least one change request (for filter dropdowns). */
  async getProjectsWithChangeRequests(): Promise<ChangeRequestProjectOption[]> {
    const { data, error } = await (supabase as any)
      .from('change_requests')
      .select('project_id, projects(id, name)')
      .not('project_id', 'is', null);

    if (error) throw error;

    const byId = new Map<string, ChangeRequestProjectOption>();
    for (const row of data || []) {
      const project = row.projects as { id: string; name: string } | null;
      if (project?.id && project?.name) {
        byId.set(project.id, { id: project.id, name: project.name });
      } else if (row.project_id) {
        byId.set(row.project_id, { id: row.project_id, name: row.project_id });
      }
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createChangeRequest(
    projectId: string,
    payload: {
      title: string;
      description: string;
      category: 'design' | 'development';
      request_type?: 'change_request' | 'feedback';
      files?: File[]; // client File objects
      preuploadedUrls?: string[]; // URLs already uploaded (e.g., pasted images)
      reference_links?: string[];
      created_by?: string | null;
    }
  ): Promise<ChangeRequest> {
    const attachmentUrls: string[] = payload.preuploadedUrls ? [...payload.preuploadedUrls] : [];

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
        status: 'Open', // normalized capitalization to match task status formatting
        request_type: payload.request_type ?? 'change_request',
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

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('change_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async addComment(id: string, commentData: { 
    message: string; 
    userId: string; 
    userName: string; 
    mentions?: string[] 
  }): Promise<void> {
    const { data: request, error: fetchError } = await (supabase as any)
      .from('change_requests')
      .select('comments')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const existingComments: ChangeRequestComment[] = request.comments 
      ? (Array.isArray(request.comments) ? request.comments : [])
      : [];

    const newComment: ChangeRequestComment = {
      id: crypto.randomUUID(),
      message: commentData.message,
      user_id: commentData.userId,
      is_edited: false,
      user_name: commentData.userName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      acknowledged: false,
      mentions: commentData.mentions || [],
    };

    const updatedComments = [...existingComments, newComment];

    const { error: updateError } = await (supabase as any)
      .from('change_requests')
      .update({ comments: updatedComments })
      .eq('id', id);

    if (updateError) throw updateError;
  }

  async updateComment(
    id: string,
    commentId: string,
    message: string,
    userId: string,
    mentions?: string[]
  ): Promise<void> {
    const { data: request, error: fetchError } = await (supabase as any)
      .from('change_requests')
      .select('comments')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const existingComments: ChangeRequestComment[] = request.comments 
      ? (Array.isArray(request.comments) ? request.comments : [])
      : [];

    const updatedComments = existingComments.map((comment) => {
      if (comment.id === commentId && comment.user_id === userId) {
        return {
          ...comment,
          message,
          mentions: mentions ?? comment.mentions,
          is_edited: true,
          updated_at: new Date().toISOString(),
        };
      }
      return comment;
    });

    const { error: updateError } = await (supabase as any)
      .from('change_requests')
      .update({ comments: updatedComments })
      .eq('id', id);

    if (updateError) throw updateError;
  }

  async updateCommentAcknowledgment(
    id: string,
    commentId: string,
    acknowledged: boolean,
    acknowledgedBy: string
  ): Promise<void> {
    const { data: request, error: fetchError } = await (supabase as any)
      .from('change_requests')
      .select('comments')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const existingComments: ChangeRequestComment[] = request.comments 
      ? (Array.isArray(request.comments) ? request.comments : [])
      : [];

    const updatedComments = existingComments.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          acknowledged,
          acknowledged_by: acknowledged ? acknowledgedBy : undefined,
          acknowledged_at: acknowledged ? new Date().toISOString() : undefined,
        };
      }
      return comment;
    });

    const { error: updateError } = await (supabase as any)
      .from('change_requests')
      .update({ comments: updatedComments })
      .eq('id', id);

    if (updateError) throw updateError;
  }
}

export const changeRequestService = new ChangeRequestService();

