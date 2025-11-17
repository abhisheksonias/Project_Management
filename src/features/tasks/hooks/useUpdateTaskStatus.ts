import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskService, UpdateTaskStatusData } from '@/features/tasks/services/taskService';
import { useAuth } from '@/contexts/AuthContext';

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: { taskId: string; status: string }) => {
      return taskService.updateTaskStatus({
        taskId: data.taskId,
        status: data.status,
        updatedBy: profile?.id || '',
      });
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && 
        (query.queryKey[0] === 'tasks' || 
         query.queryKey[0] === 'dashboard-tasks' || 
         query.queryKey[0] === 'calendar-tasks')
      });

      // Snapshot the previous value for rollback
      const previousQueries = queryClient.getQueryCache().findAll({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === 'tasks' || 
           query.queryKey[0] === 'dashboard-tasks' || 
           query.queryKey[0] === 'calendar-tasks')
      });

      const previousTasks = previousQueries.map(query => ({
        queryKey: query.queryKey,
        data: query.state.data,
      }));

      // Update all task queries optimistically
      previousQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((task: any) =>
            task.id === taskId ? { ...task, status } : task
          );
        });
      });

      // Return context with snapshot for rollback
      return { previousTasks };
    },
    // If mutation fails, rollback optimistic update
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to update task status');
      console.error(err);
    },
    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      // Also invalidate projects in case task counts affect project stats
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onSuccess: () => {
      toast.success('Task status updated successfully');
    },
  });
};

