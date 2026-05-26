import { supabase } from '@/integrations/supabase/client';
import { ProjectComment } from './projectService';
import { TaskComment } from '@/features/tasks/services/taskService';

export interface ProjectMention {
  id: string;
  commentId: string;
  projectId: string;
  projectName: string;
  message: string;
  user_name: string;
  created_at: string;
  acknowledged: boolean;
  type: 'project';
}

export interface TaskMention {
  id: string;
  commentId: string;
  taskId: string;
  taskName: string;
  projectId: string | null;
  projectName: string | null;
  message: string;
  user_name: string;
  created_at: string;
  acknowledged: boolean;
  type: 'task';
}

export type Mention = ProjectMention | TaskMention;

class MentionService {
  /**
   * Get all unacknowledged mentions for a user across all projects
   */
  async getUserMentions(userId: string): Promise<ProjectMention[]> {
    // Get all projects with comments
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, comments')
      .not('comments', 'is', null);

    if (error) throw error;

    const mentions: ProjectMention[] = [];

    // Process each project's comments
    projects?.forEach((project) => {
      if (!project.comments) return;

      const comments = Array.isArray(project.comments)
        ? project.comments
        : [];

      comments.forEach((comment: ProjectComment) => {
        // Check if user is mentioned and comment is not acknowledged
        if (
          comment.mentions?.includes(userId) &&
          !comment.acknowledged
        ) {
          mentions.push({
            id: comment.id,
            commentId: comment.id,
            projectId: project.id,
            projectName: project.name,
            message: comment.message,
            user_name: comment.user_name,
            created_at: comment.created_at,
            acknowledged: comment.acknowledged || false,
            type: 'project',
          });
        }
      });
    });

    // Sort by created_at (newest first)
    return mentions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get all unacknowledged task mentions for a user
   */
  async getTaskMentions(userId: string): Promise<TaskMention[]> {
    // Get all tasks with comments
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, name, comment, project_id, projects(name)')
      .not('comment', 'is', null);

    if (error) throw error;

    const mentions: TaskMention[] = [];

    // Process each task's comments
    tasks?.forEach((task) => {
      if (!task.comment) return;

      const comments = Array.isArray(task.comment)
        ? task.comment
        : [];

      comments.forEach((comment: TaskComment) => {
        // Check if user is mentioned and comment is not acknowledged
        if (
          comment.mentions?.includes(userId) &&
          !comment.acknowledged
        ) {
          mentions.push({
            id: comment.id,
            commentId: comment.id,
            taskId: task.id,
            taskName: task.name || 'Unnamed Task',
            projectId: task.project_id,
            projectName: (task.projects as any)?.name || null,
            message: comment.message,
            user_name: comment.user_name,
            created_at: comment.created_at,
            acknowledged: comment.acknowledged || false,
            type: 'task',
          });
        }
      });
    });

    // Sort by created_at (newest first)
    return mentions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get all mentions (both project and task) for a user
   */
  async getAllMentions(userId: string): Promise<Mention[]> {
    const [projectMentions, taskMentions] = await Promise.all([
      this.getUserMentions(userId),
      this.getTaskMentions(userId),
    ]);

    // Combine and sort by created_at (newest first)
    return [...projectMentions, ...taskMentions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
}

export const mentionService = new MentionService();

