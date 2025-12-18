import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectService, AddCommentData } from '@/features/projects/services/projectService';
import { useAuth } from '@/contexts/AuthContext';

export const useAddProjectComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddCommentData) => projectService.addComment(data),
    onSuccess: (_, variables) => {
      // Optimistically update the project with the new comment
      queryClient.setQueriesData(
        { queryKey: ['dashboard-projects'] },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((project) => {
            if (project.id === variables.projectId) {
              const newComment = {
                id: crypto.randomUUID(),
                message: variables.message,
                user_name: variables.userName,
                created_at: new Date().toISOString(),
                acknowledged: false,
                mentions: variables.mentions || [],
              };
              const existingComments = project.comments || [];
              return {
                ...project,
                comments: [...existingComments, newComment],
              };
            }
            return project;
          });
        }
      );

      // Also invalidate to ensure server sync
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-project-stats'] });
      // Invalidate mentions when new comment with mentions is added
      if (variables.mentions && variables.mentions.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
      }
      toast.success('Comment added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add comment');
      console.error(error);
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
    },
  });
};

export const useUpdateCommentAcknowledgment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      commentId,
      acknowledged,
      acknowledgedBy,
    }: {
      projectId: string;
      commentId: string;
      acknowledged: boolean;
      acknowledgedBy: string;
    }) => projectService.updateCommentAcknowledgment(projectId, commentId, acknowledged, acknowledgedBy),
    onSuccess: (_, variables) => {
      // Optimistically update the project with the updated comment
      queryClient.setQueriesData(
        { queryKey: ['dashboard-projects'] },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((project) => {
            if (project.id === variables.projectId && project.comments) {
              const updatedComments = project.comments.map((comment: any) => {
                if (comment.id === variables.commentId) {
                  return {
                    ...comment,
                    acknowledged: variables.acknowledged,
                    acknowledged_by: variables.acknowledged ? variables.acknowledgedBy : undefined,
                    acknowledged_at: variables.acknowledged ? new Date().toISOString() : undefined,
                  };
                }
                return comment;
              });
              return {
                ...project,
                comments: updatedComments,
              };
            }
            return project;
          });
        }
      );

      // Also invalidate to ensure server sync
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-project-stats'] });
      // Invalidate mentions when acknowledgment changes
      queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
    },
    onError: (error) => {
      toast.error('Failed to update comment acknowledgment');
      console.error(error);
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
    },
  });
};

export const useUpdateProjectComment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      commentId: string;
      message: string;
      mentions?: string[];
    }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return projectService.updateCommentMessage(
        data.projectId,
        data.commentId,
        data.message,
        profile.id,
        data.mentions
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-project-stats'] });
      // Invalidate mentions when comment is updated
      queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
      toast.success('Comment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
};

