import { supabase } from '@/integrations/supabase/client';

export interface TaskComment {
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
  mentions?: string[]; // Array of user IDs mentioned in this comment
}

export interface TaskAssignee {
  task_id: string;
  user_id: string;
  role?: string | null;
  assigned_at: string;
  users?: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface Task {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  project_id: string | null;
  milestone_id?: string | null;
  category?: string;
  created_at?: string | null;
  updated_at?: string | null;
  estimate_hours?: number | null;
  type?: string | null;
  comment?: TaskComment[] | any; // JSON field for comments
  // Assignees from task_assignees table
  assignees?: TaskAssignee[];
  projects?: {
    name: string;
  };
  milestones?: {
    id: string;
    name: string;
    sort_order: number | null;
  };
}

export interface UpdateTaskStatusData {
  taskId: string;
  status: string;
  updatedBy: string;
}

export interface AddTaskCommentData {
  taskId: string;
  message: string;
  userId: string;
  userName: string;
  mentions?: string[]; // Array of user IDs mentioned in this comment
}

export interface CreateTaskData {
  name: string;
  description?: string | null;
  status?: string | null;
  type?: string | null;
  priority?: string | null;
  deadline?: string | Date | null;
  project_id?: string | null;
  category?: string | null;
  estimate_hours?: number | null;
  assigned_user_ids?: string[]; // Multiple user assignments via task_assignees table
  milestone_id?: string | null; // Milestone association
}

class TaskService {
  async getUserTasks(userId: string, filters?: { category?: string }): Promise<Task[]> {
    // First, get task IDs assigned to the user via task_assignees table
    const { data: assigneesData, error: assigneesError } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', userId);

    if (assigneesError) throw assigneesError;

    const taskIds = assigneesData?.map((a) => a.task_id) || [];

    if (taskIds.length === 0) return [];

    // Now fetch tasks with assignees
    let query = supabase
      .from('tasks')
      .select(`
        id,
        name,
        description,
        status,
        priority,
        deadline,
        project_id,
        milestone_id,
        category,
        created_at,
        updated_at,
        estimate_hours,
        type,
        comment,
        projects(name),
        milestones:milestones!tasks_milestone_id_fkey (id, name, sort_order),
        task_assignees:task_assignees (
          task_id,
          user_id,
          role,
          assigned_at,
          users:users!task_assignees_user_id_fkey (
            id,
            name,
            email
          )
        )
      `)
      .in('id', taskIds);

    // Apply category filter if provided
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to include assignees array
    return (data || []).map((task: any) => ({
      ...task,
      assignees: task.task_assignees || [],
    })) as Task[];
  }

  async updateTaskStatus(data: UpdateTaskStatusData): Promise<void> {
    // Get current task status
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', data.taskId)
      .single();

    if (fetchError) throw fetchError;

    // Only update if status changed
    if (currentTask && currentTask.status !== data.status) {
      // Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: data.status })
        .eq('id', data.taskId);

      if (updateError) throw updateError;

      // Insert into status_history
      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          entity_type: 'task',
          entity_id: data.taskId,
          status: data.status,
          updated_by: data.updatedBy,
        });

      if (historyError) throw historyError;

      // No app-level syncing to change_requests here — change_requests and tasks are independent.
    }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        name,
        description,
        status,
        priority,
        deadline,
        project_id,
        milestone_id,
        category,
        created_at,
        updated_at,
        comment,
        projects(name),
        milestones:milestones!tasks_milestone_id_fkey (id, name, sort_order),
        task_assignees:task_assignees (
          task_id,
          user_id,
          role,
          assigned_at,
          users:users!task_assignees_user_id_fkey (
            id,
            name,
            email
          )
        )
      `)
      .eq('id', taskId)
      .single();

    if (error) throw error;

    if (!data) return null;

    return {
      ...data,
      assignees: (data as any).task_assignees || [],
    } as Task;
  }

  async addTaskComment(data: AddTaskCommentData): Promise<void> {
    // Get current task
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('comment')
      .eq('id', data.taskId)
      .single();

    if (fetchError) throw fetchError;

    // Parse existing comments
    const existingComments: TaskComment[] = task.comment
      ? (Array.isArray(task.comment) ? task.comment : [])
      : [];

    // Add new comment
    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      message: data.message,
      user_id: data.userId,
      is_edited: false,
      user_name: data.userName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      acknowledged: false,
      mentions: data.mentions || [],
    };

    const updatedComments = [...existingComments, newComment];

    // Update task with new comments array
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ comment: updatedComments })
      .eq('id', data.taskId);

    if (updateError) throw updateError;
  }

  async updateTaskCommentAcknowledgment(
    taskId: string,
    commentId: string,
    acknowledged: boolean,
    acknowledgedBy: string
  ): Promise<void> {
    // Get current task
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('comment')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    // Parse existing comments
    const existingComments: TaskComment[] = task.comment
      ? (Array.isArray(task.comment) ? task.comment : [])
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

    // Update task with updated comments array
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ comment: updatedComments })
      .eq('id', taskId);

    if (updateError) throw updateError;
  }

  async updateTaskCommentMessage(
    taskId: string,
    commentId: string,
    message: string,
    userId: string,
    mentions?: string[]
  ): Promise<void> {
    // Get current task
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('comment')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    // Parse existing comments
    const existingComments: TaskComment[] = task.comment
      ? (Array.isArray(task.comment) ? task.comment : [])
      : [];

    // Update the specific comment
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

    // Update task with updated comments array
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ comment: updatedComments })
      .eq('id', taskId);

    if (updateError) throw updateError;
  }

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskData, createdBy: string): Promise<Task> {
    // Handle deadline - convert Date to ISO string if needed
    let deadline: string | null = null;
    if (data.deadline) {
      if (data.deadline instanceof Date) {
        deadline = data.deadline.toISOString();
      } else if (typeof data.deadline === 'string') {
        deadline = data.deadline;
      }
    }

    const payload = {
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'To Do',
      type: data.type ?? null,
      priority: data.priority ?? null,
      deadline,
      project_id: data.project_id ?? null,
      category: data.category ?? null,
      estimate_hours: data.estimate_hours ?? null,
      milestone_id: data.milestone_id && data.milestone_id !== 'none' ? data.milestone_id : null,
    };

    const { data: inserted, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select(
        `
          id,
          name,
          description,
          status,
          priority,
          deadline,
          project_id,
          category,
          estimate_hours,
          type,
          created_at,
          updated_at,
          comment,
          projects:projects!tasks_project_id_fkey (name)
        `
      )
      .single();

    if (error) throw error;

    // Handle multiple user assignments via task_assignees table
    if (data.assigned_user_ids && data.assigned_user_ids.length > 0) {
      const assigneesData = data.assigned_user_ids.map((userId) => ({
        task_id: inserted.id,
        user_id: userId,
        role: null, // Can be extended later
        assigned_at: new Date().toISOString(),
      }));

      const { error: assigneesError } = await supabase
        .from('task_assignees')
        .insert(assigneesData);

      if (assigneesError) {
        console.error('Error creating task assignees:', assigneesError);
        // Don't throw - task is created, assignees can be added later
      }
    }

    return {
      ...inserted,
      assignees: (data as any).assigned_user_ids || [],
    } as Task;
  }
}

export const taskService = new TaskService();

