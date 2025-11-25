import { useQuery } from '@tanstack/react-query';
import { adminWorklogService, AdminWorklog } from '../services/adminWorklogService';

export const useTaskWorklogs = (taskId: string | null | undefined) => {
  return useQuery<AdminWorklog[]>({
    queryKey: ['admin', 'task-worklogs', taskId],
    queryFn: async () => {
      if (!taskId) {
        return [];
      }
      return adminWorklogService.getWorklogsByTask(taskId);
    },
    staleTime: 60_000,
    enabled: !!taskId,
  });
};

