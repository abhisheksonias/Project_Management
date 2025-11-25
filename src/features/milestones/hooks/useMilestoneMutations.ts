import { useMutation, useQueryClient } from '@tanstack/react-query';
import { milestoneService, CreateMilestoneData, UpdateMilestoneData } from '../services/milestoneService';
import { toast } from 'sonner';

export const useCreateMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMilestoneData) => milestoneService.createMilestone(data),
    onSuccess: (data) => {
      // Invalidate milestones queries
      queryClient.invalidateQueries({ queryKey: ['milestones', 'project', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'all'] });
      // Invalidate project details if needed
      queryClient.invalidateQueries({ queryKey: ['projects', data.project_id] });
      toast.success('Milestone created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create milestone: ${error.message}`);
    },
  });
};

export const useUpdateMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMilestoneData }) =>
      milestoneService.updateMilestone(id, data),
    onSuccess: (data) => {
      // Invalidate milestones queries
      queryClient.invalidateQueries({ queryKey: ['milestones', 'project', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', data.id] });
      // Invalidate tasks that might be linked to this milestone
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Milestone updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });
};

export const useDeleteMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => milestoneService.deleteMilestone(id),
    onSuccess: (_, deletedId) => {
      // Invalidate all milestone queries
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      // Invalidate tasks that might be linked to this milestone
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Milestone deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete milestone: ${error.message}`);
    },
  });
};

