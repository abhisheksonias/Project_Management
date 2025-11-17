import { useQuery } from '@tanstack/react-query';
import { worklogService } from '@/features/worklogs/services/worklogService';

export const useDashboardWorklogs = (userId: string, month?: Date) => {
  return useQuery({
    queryKey: ['dashboard-worklogs', userId, month?.getMonth(), month?.getFullYear()],
    queryFn: () => worklogService.getUserWorklogs(userId, month),
    enabled: !!userId,
  });
};

