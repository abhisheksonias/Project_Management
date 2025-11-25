import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/features/tasks/services/taskService';

export interface CreateTaskData {
  name: string;
  description?: string | null;
  status?: string | null;
  type?: string | null;
  priority?: string | null;
  deadline?: string | null;
  project_id?: string | null;
  category?: string | null;
  estimate_hours?: number | null;
  assigned_user_ids?: string[]; // Multiple user assignments via task_assignees table
  milestone_id?: string | null; // Milestone association
}

export interface UpdateTaskData {
  name?: string;
  description?: string | null;
  status?: string | null;
  type?: string | null;
  priority?: string | null;
  deadline?: string | null;
  project_id?: string | null;
  category?: string | null;
  estimate_hours?: number | null;
  assigned_user_ids?: string[]; // Multiple user assignments via task_assignees table
  milestone_id?: string | null; // Milestone association
}

class AdminTaskService {
  async getAllTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
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
          milestone_id,
          created_at,
          updated_at,
          comment,
          projects:projects!tasks_project_id_fkey (name),
          milestones:milestones!tasks_milestone_id_fkey (id, name),
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
        `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the data to include assignees array
    return (data || []).map((task: any) => ({
      ...task,
      assignees: task.task_assignees || [],
    })) as Task[];
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
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
          milestone_id,
          created_at,
          updated_at,
          comment,
          projects:projects!tasks_project_id_fkey (name),
          milestones:milestones!tasks_milestone_id_fkey (id, name),
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
        `
      )
      .eq('id', taskId)
      .single();

    if (error) throw error;
    
    if (!data) return null;
    
    return {
      ...data,
      assignees: (data as any).task_assignees || [],
    } as Task;
  }

  async createTask(data: CreateTaskData, createdBy: string): Promise<Task> {
    const payload = {
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'To Do',
      type: data.type ?? null,
      priority: data.priority ?? null,
      deadline: data.deadline ?? null,
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

    if (payload.status) {
      await this.recordStatusChange(inserted.id, payload.status, createdBy);
    }

    // Fetch the task with assignees
    const taskWithAssignees = await this.getTaskById(inserted.id);
    return taskWithAssignees || (inserted as Task);
  }

  async updateTask(taskId: string, data: UpdateTaskData, updatedBy: string): Promise<Task> {
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    const updatePayload: Record<string, any> = {};

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description ?? null;
    if (data.status !== undefined) updatePayload.status = data.status ?? null;
    if (data.type !== undefined) updatePayload.type = data.type ?? null;
    if (data.priority !== undefined) updatePayload.priority = data.priority ?? null;
    if (data.deadline !== undefined) updatePayload.deadline = data.deadline ?? null;
    if (data.project_id !== undefined) updatePayload.project_id = data.project_id ?? null;
    if (data.category !== undefined) updatePayload.category = data.category ?? null;
    if (data.estimate_hours !== undefined)
      updatePayload.estimate_hours = data.estimate_hours ?? null;
    if (data.milestone_id !== undefined) {
      updatePayload.milestone_id = data.milestone_id && data.milestone_id !== 'none' ? data.milestone_id : null;
    }

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
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
    if (data.assigned_user_ids !== undefined) {
      // Delete existing assignees
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) {
        console.error('Error deleting task assignees:', deleteError);
      }

      // Insert new assignees
      if (data.assigned_user_ids.length > 0) {
        const assigneesData = data.assigned_user_ids.map((userId) => ({
          task_id: taskId,
          user_id: userId,
          role: null, // Can be extended later
          assigned_at: new Date().toISOString(),
        }));

        const { error: assigneesError } = await supabase
          .from('task_assignees')
          .insert(assigneesData);

        if (assigneesError) {
          console.error('Error updating task assignees:', assigneesError);
        }
      }
    }

    if (
      data.status !== undefined &&
      data.status !== currentTask?.status &&
      data.status !== null
    ) {
      await this.recordStatusChange(taskId, data.status, updatedBy);
    }

    // Fetch the task with assignees
    const taskWithAssignees = await this.getTaskById(taskId);
    return taskWithAssignees || (updatedTask as Task);
  }

  async updateTaskStatus(taskId: string, status: string, updatedBy: string): Promise<void> {
    await this.updateTask(taskId, { status }, updatedBy);
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  }

  private async recordStatusChange(taskId: string, status: string, updatedBy: string) {
    const { error } = await supabase
      .from('status_history')
      .insert({
        entity_type: 'task',
        entity_id: taskId,
        status,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error recording task status change:', error);
    }
  }
}

export const adminTaskService = new AdminTaskService();


