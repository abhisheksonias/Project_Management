import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { worklogService, CreateWorklogData, UpdateWorklogData } from '@/features/worklogs/services/worklogService';

export const useCreateWorklogHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorklogData) => worklogService.createWorklog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklog-history'] });
      queryClient.invalidateQueries({ queryKey: ['worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'hours-summary'] });
      toast.success('Worklog added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add worklog');
      console.error(error);
    },
  });
};

export const useUpdateWorklogHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorklogData }) =>
      worklogService.updateWorklog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklog-history'] });
      queryClient.invalidateQueries({ queryKey: ['worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'hours-summary'] });
      toast.success('Worklog updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update worklog');
      console.error(error);
    },
  });
};

export const useDeleteWorklogHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => worklogService.deleteWorklog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklog-history'] });
      queryClient.invalidateQueries({ queryKey: ['worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'hours-summary'] });
      toast.success('Worklog deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete worklog');
      console.error(error);
    },
  });
};

export const useDeleteMultipleWorklogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => worklogService.deleteMultipleWorklogs(ids),
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['worklog-history'] });
      queryClient.invalidateQueries({ queryKey: ['worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'hours-summary'] });
      toast.success(`${deletedCount} worklog(s) deleted successfully`);
    },
    onError: (error) => {
      toast.error('Failed to delete worklogs');
      console.error(error);
    },
  });
};

