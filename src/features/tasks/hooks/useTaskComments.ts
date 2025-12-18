import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskService, AddTaskCommentData } from '../services/taskService';
import { useAuth } from '@/contexts/AuthContext';

export const useAddTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddTaskCommentData) => taskService.addTaskComment(data),
    onSuccess: (_, variables) => {
      // Find all task queries and update them
      const taskQueries = queryClient.getQueryCache().findAll({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks' 
      });
      
      // Update each query
      taskQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((task: any) => {
            if (task.id === variables.taskId) {
              const newComment = {
                id: crypto.randomUUID(),
                message: variables.message,
                user_id: variables.userId,
                is_edited: false,
                user_name: variables.userName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                acknowledged: false,
                mentions: variables.mentions || [],
              };
              const existingComments = Array.isArray(task.comment) ? task.comment : [];
              return {
                ...task,
                comment: [...existingComments, newComment],
              };
            }
            return task;
          });
        });
      });

      toast.success('Comment added successfully');
      // Invalidate to ensure server sync (optimistic update is already applied)
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks',
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks', variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks'],
      });
      // Invalidate mentions when new comment with mentions is added
      if (variables.mentions && variables.mentions.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
      }
    },
    onError: (error) => {
      toast.error('Failed to add comment');
      console.error(error);
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks',
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks'],
      });
    },
  });
};

export const useUpdateTaskCommentAcknowledgment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      acknowledged,
      acknowledgedBy,
    }: {
      taskId: string;
      commentId: string;
      acknowledged: boolean;
      acknowledgedBy: string;
    }) => taskService.updateTaskCommentAcknowledgment(taskId, commentId, acknowledged, acknowledgedBy),
    onMutate: async ({ taskId, commentId, acknowledged, acknowledgedBy }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks' });

      // Snapshot all task queries for rollback
      const previousQueries = queryClient.getQueryCache().findAll({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks' 
      });
      const snapshots = previousQueries.map((query) => ({
        queryKey: query.queryKey,
        data: query.state.data,
      }));

      // Find all task queries and update them
      const taskQueries = queryClient.getQueryCache().findAll({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks' 
      });
      
      // Update each query
      taskQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((task: any) => {
            if (task.id === taskId && task.comment) {
              const updatedComments = (Array.isArray(task.comment) ? task.comment : []).map((comment: any) => {
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
              return {
                ...task,
                comment: updatedComments,
              };
            }
            return task;
          });
        });
      });

      return { snapshots };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.snapshots) {
        context.snapshots.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to update comment acknowledgment');
      console.error(err);
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks',
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks'],
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate to ensure server sync (optimistic update is already applied)
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks',
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks', variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks'],
      });
      // Invalidate mentions when acknowledgment changes
      queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
    },
  });
};

export const useUpdateTaskComment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: {
      taskId: string;
      commentId: string;
      message: string;
      mentions?: string[];
    }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return taskService.updateTaskCommentMessage(
        data.taskId,
        data.commentId,
        data.message,
        profile.id,
        data.mentions
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate all task queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks',
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks', variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tasks'],
      });
      // Invalidate mentions when comment is updated
      queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
      toast.success('Comment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
};

