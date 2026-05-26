import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  adminTaskService,
  CreateTaskData,
  UpdateTaskData,
} from '@/features/admin/services/adminTaskService';

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: CreateTaskData) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return adminTaskService.createTask(data, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return adminTaskService.updateTask(taskId, data, profile.id);
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'task', updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => adminTaskService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });
};

export const useUpdateTaskStatusAdmin = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return adminTaskService.updateTaskStatus(taskId, status, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      toast.success('Task status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
};


