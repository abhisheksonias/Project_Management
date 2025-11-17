import { supabase } from '@/integrations/supabase/client';

export interface ProjectComment {
  id: string;
  message: string;
  user_name: string;
  user_id?: string;
  created_at: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  mentions?: string[]; // Array of user IDs mentioned in this comment
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  type: string;
  priority: string | null;
  deadline: string | null;
  category: string | null;
  reference: string | null;
  created_at: string | null;
  comments: ProjectComment[] | null;
  admin_id: string | null;
  // Computed/task-related fields
  openTasks?: number;
  overdueTasks?: number;
  totalTasks?: number;
  progress?: number;
  adminName?: string;
}

export interface ProjectStats {
  open: number;
  inProgress: number;
  completed: number;
  onHold: number;
  clientApproval: number;
}

export interface AddCommentData {
  projectId: string;
  message: string;
  userId: string;
  userName: string;
  mentions?: string[]; // Array of user IDs mentioned in this comment
}

class ProjectService {
  async getUserProjects(userId: string): Promise<Project[]> {
    // Get task IDs assigned to the user via task_assignees table
    const { data: assigneesData, error: assigneesError } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', userId);

    if (assigneesError) throw assigneesError;

    const taskIds = assigneesData?.map((a) => a.task_id) || [];
    
    if (taskIds.length === 0) return [];

    // Get projects where user has tasks assigned
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('project_id, projects(*)')
      .in('id', taskIds)
      .not('project_id', 'is', null);

    if (tasksError) throw tasksError;

    // Extract unique project IDs
    const projectIds = Array.from(new Set(tasksData?.map(t => t.project_id).filter(Boolean) || []));

    if (projectIds.length === 0) return [];

    // Fetch full project details with task counts
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds);

    if (projectsError) throw projectsError;

    // Get task counts for each project (only tasks assigned to this user)
    const { data: allTasks, error: allTasksError } = await supabase
      .from('tasks')
      .select('id, project_id, status, deadline')
      .in('id', taskIds)
      .in('project_id', projectIds);

    if (allTasksError) throw allTasksError;

    // Calculate stats per project
    const taskStats = new Map<string, { total: number; open: number; overdue: number }>();
    allTasks?.forEach((task) => {
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

    // Format projects with task stats
    const projects = projectsData.map((project: any) => {
      const stats = taskStats.get(project.id) || { total: 0, open: 0, overdue: 0 };
      const comments = project.comments ? (Array.isArray(project.comments) ? project.comments : []) : [];
      
      // Calculate progress (simplified - based on completed tasks)
      const projectTasks = allTasks?.filter(t => t.project_id === project.id) || [];
      const completedCount = projectTasks.filter(t => t.status === 'Completed').length;
      const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

      return {
        ...project,
        openTasks: stats.open,
        overdueTasks: stats.overdue,
        totalTasks: stats.total,
        progress,
        comments: comments as ProjectComment[],
      } as Project;
    });

    return projects;
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data as Project | null;
  }

  async addComment(data: AddCommentData): Promise<void> {
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

  async getProjectStats(userId: string): Promise<ProjectStats> {
    const projects = await this.getUserProjects(userId);
    
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
}

export const projectService = new ProjectService();

