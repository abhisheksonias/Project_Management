import { supabase } from '@/integrations/supabase/client';
import { Project, ProjectComment, ProjectStats } from '@/features/projects/services/projectService';

export interface CreateProjectData {
  name: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  admin_id?: string | null;
  vendor_id?: string | null;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  admin_id?: string | null;
  vendor_id?: string | null;
}

class AdminProjectService {
  async getAllProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*, vendors(id, name, email, phone, website)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get task counts for each project
    const projectIds = data?.map(p => p.id) || [];
    
    if (projectIds.length === 0) {
      return this.formatProjects(data || []);
    }

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, project_id, status, deadline')
      .in('project_id', projectIds);

    if (tasksError) throw tasksError;

    // Get admin names
    const adminIds = Array.from(new Set(data?.map(p => p.admin_id).filter(Boolean) || []));
    let adminMap = new Map<string, { name: string }>();
    
    if (adminIds.length > 0) {
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', adminIds);

      if (!adminsError && admins) {
        adminMap = new Map(admins.map(a => [a.id, { name: a.name }]));
      }
    }

    return this.formatProjects(data || [], allTasks || [], adminMap);
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*, vendors(id, name, email, phone, website)')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Get task counts
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, deadline')
      .eq('project_id', projectId);

    if (tasksError) throw tasksError;

    // Get admin name
    let adminName: string | undefined;
    if (data.admin_id) {
      const { data: admin, error: adminError } = await supabase
        .from('users')
        .select('name')
        .eq('id', data.admin_id)
        .single();

      if (!adminError && admin) {
        adminName = admin.name;
      }
    }

    const formatted = this.formatProjects([data], tasks || [], new Map(data.admin_id && adminName ? [[data.admin_id, { name: adminName }]] : []));
    return formatted[0] || null;
  }

  async createProject(data: CreateProjectData, createdBy: string): Promise<Project> {
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        client_access_token: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? (crypto as any).randomUUID()
          : // fallback: generate a simple UUID-like token
            `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`,
      })
      .select('*, vendors(id, name, email, phone, website)')
      .single();

    if (error) throw error;

    // Record status change in status_history if status is provided
    if (data.status) {
      await this.recordStatusChange(project.id, 'project', data.status, createdBy);
    }

    return this.formatProjects([project])[0];
  }

  async updateProject(
    projectId: string,
    data: UpdateProjectData,
    updatedBy: string
  ): Promise<Project> {
    // Get current project to check status change
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .single();

    if (fetchError) throw fetchError;

    // Update project
    const { data: project, error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', projectId)
      .select('*, vendors(id, name, email, phone, website)')
      .single();

    if (error) throw error;

    // Record status change in status_history if status changed
    if (data.status && data.status !== currentProject?.status) {
      await this.recordStatusChange(projectId, 'project', data.status, updatedBy);
    }

    return this.formatProjects([project])[0];
  }

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }

  async getProjectStats(): Promise<ProjectStats> {
    const projects = await this.getAllProjects();

    const stats: ProjectStats = {
      open: 0,
      inProgress: 0,
      completed: 0,
      onHold: 0,
      clientApproval: 0,
    };

    projects.forEach((project) => {
      const status = project.status?.toLowerCase() || '';
      if (status === 'open') stats.open++;
      else if (status === 'in progress') stats.inProgress++;
      else if (status === 'completed') stats.completed++;
      else if (status === 'on hold') stats.onHold++;
      else if (status === 'client approval') stats.clientApproval++;
    });

    return stats;
  }

  async addComment(data: {
    projectId: string;
    message: string;
    userId: string;
    userName: string;
    mentions?: string[];
  }): Promise<void> {
    // Get current project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('comments')
      .eq('id', data.projectId)
      .single();

    if (fetchError) throw fetchError;

    // Parse existing comments
    const existingComments = project.comments
      ? (Array.isArray(project.comments) ? project.comments : [])
      : [];

    // Add new comment
    const newComment: ProjectComment = {
      id: crypto.randomUUID(),
      message: data.message,
      user_name: data.userName,
      user_id: data.userId,
      created_at: new Date().toISOString(),
      acknowledged: false,
      mentions: data.mentions || [],
    };

    const updatedComments = [...existingComments, newComment];

    // Update project with new comments array
    const { error: updateError } = await supabase
      .from('projects')
      .update({ comments: updatedComments })
      .eq('id', data.projectId);

    if (updateError) throw updateError;
  }

  async updateCommentAcknowledgment(
    projectId: string,
    commentId: string,
    acknowledged: boolean,
    acknowledgedBy: string
  ): Promise<void> {
    // Get current project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('comments')
      .eq('id', projectId)
      .single();

    if (fetchError) throw fetchError;

    // Parse existing comments
    const existingComments: ProjectComment[] = project.comments
      ? (Array.isArray(project.comments) ? project.comments : [])
      : [];

    // Update the specific comment
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

    // Update project with updated comments array
    const { error: updateError } = await supabase
      .from('projects')
      .update({ comments: updatedComments })
      .eq('id', projectId);

    if (updateError) throw updateError;
  }

  async updateCommentMessage(
    projectId: string,
    commentId: string,
    message: string,
    userId: string,
    mentions?: string[]
  ): Promise<void> {
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('comments')
      .eq('id', projectId)
      .single();

    if (fetchError) throw fetchError;

    const existingComments: ProjectComment[] = project.comments
      ? (Array.isArray(project.comments) ? project.comments : [])
      : [];

    const updatedComments = existingComments.map((comment) => {
      if (comment.id === commentId && comment.user_id === userId) {
        return {
          ...comment,
          message,
          mentions: mentions ?? comment.mentions,
          updated_at: new Date().toISOString(),
        };
      }
      return comment;
    });

    const { error: updateError } = await supabase
      .from('projects')
      .update({ comments: updatedComments })
      .eq('id', projectId);

    if (updateError) throw updateError;
  }

  private async recordStatusChange(
    entityId: string,
    entityType: 'project' | 'task',
    status: string,
    updatedBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from('status_history')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        status,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error recording status change:', error);
      // Don't throw - status history is not critical
    }
  }

  private formatProjects(
    projects: any[],
    tasks: any[] = [],
    adminMap: Map<string, { name: string }> = new Map()
  ): Project[] {
    // Calculate task stats per project
    const taskStats = new Map<string, { total: number; open: number; overdue: number }>();
    
    tasks.forEach((task) => {
      if (!task.project_id) return;

      const stats = taskStats.get(task.project_id) || { total: 0, open: 0, overdue: 0 };
      stats.total++;

      if (task.status === 'To Do' || task.status === 'In Progress') {
        stats.open++;
      }

      if (task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed') {
        stats.overdue++;
      }

      taskStats.set(task.project_id, stats);
    });

    return projects.map((project: any) => {
      const stats = taskStats.get(project.id) || { total: 0, open: 0, overdue: 0 };
      const comments = project.comments
        ? (Array.isArray(project.comments) ? project.comments : [])
        : [];

      // Calculate progress
      const projectTasks = tasks.filter((t) => t.project_id === project.id);
      const completedCount = projectTasks.filter((t) => t.status === 'Completed').length;
      const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

      // Get admin name
      const adminName = project.admin_id && adminMap.has(project.admin_id)
        ? adminMap.get(project.admin_id)!.name
        : undefined;

      const vendor = project.vendors
        ? {
            id: project.vendors.id,
            name: project.vendors.name,
            email: project.vendors.email,
            phone: project.vendors.phone,
            website: project.vendors.website,
          }
        : project.vendor || null;

      const { vendors, ...rest } = project;

      return {
        ...rest,
        openTasks: stats.open,
        overdueTasks: stats.overdue,
        totalTasks: stats.total,
        progress,
        comments: comments as ProjectComment[],
        adminName,
        vendor,
      } as Project;
    });
  }
}

export const adminProjectService = new AdminProjectService();

