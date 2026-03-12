import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { changeRequestService } from '../services/changeRequestService';
import { useAuth } from '@/contexts/AuthContext';

export const useAddChangeRequestComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      requestId: string;
      message: string;
      userId: string;
      userName: string;
      mentions?: string[];
    }) => changeRequestService.addComment(data.requestId, {
      message: data.message,
      userId: data.userId,
      userName: data.userName,
      mentions: data.mentions,
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-change-requests'] });
      toast.success('Comment added successfully');
      
      if (variables.mentions && variables.mentions.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
      }
    },
    onError: (error) => {
      toast.error('Failed to add comment');
      console.error(error);
    },
  });
};

export const useUpdateChangeRequestComment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: {
      requestId: string;
      commentId: string;
      message: string;
      mentions?: string[];
    }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return changeRequestService.updateComment(
        data.requestId,
        data.commentId,
        data.message,
        profile.id,
        data.mentions
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
      toast.success('Comment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
};

export const useUpdateChangeRequestCommentAcknowledgment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      requestId: string;
      commentId: string;
      acknowledged: boolean;
      acknowledgedBy: string;
    }) => changeRequestService.updateCommentAcknowledgment(
      data.requestId,
      data.commentId,
      data.acknowledged,
      data.acknowledgedBy
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
    },
    onError: (error) => {
      toast.error('Failed to update acknowledgment');
      console.error(error);
    },
  });
};
