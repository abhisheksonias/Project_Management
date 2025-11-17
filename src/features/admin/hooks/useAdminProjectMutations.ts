import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminProjectService, CreateProjectData, UpdateProjectData } from '../services/adminProjectService';
import { Project } from '@/features/projects/services/projectService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: CreateProjectData) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return adminProjectService.createProject(data, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'project-stats'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdateProjectData }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return adminProjectService.updateProject(projectId, data, profile.id);
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'project', updatedProject.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'project-stats'] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => adminProjectService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'project-stats'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });
};

export const useAddProjectComment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      message: string;
      userId: string;
      userName: string;
      mentions?: string[];
    }) => adminProjectService.addComment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'project', variables.projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
};

export const useUpdateCommentAcknowledgment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      commentId: string;
      acknowledged: boolean;
      acknowledgedBy: string;
    }) =>
      adminProjectService.updateCommentAcknowledgment(
        data.projectId,
        data.commentId,
        data.acknowledged,
        data.acknowledgedBy
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'project', variables.projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`);
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
      return adminProjectService.updateCommentMessage(
        data.projectId,
        data.commentId,
        data.message,
        profile.id,
        data.mentions
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'project', variables.projectId] });
      toast.success('Comment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
};

