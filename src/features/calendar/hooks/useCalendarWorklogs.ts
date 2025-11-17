import { useQuery } from '@tanstack/react-query';
import { worklogService, Worklog } from '@/features/worklogs/services/worklogService';

export const useCalendarWorklogs = (userId: string, month?: Date) => {
  return useQuery<Worklog[]>({
    queryKey: ['worklogs', userId, month?.getMonth(), month?.getFullYear()],
    queryFn: () => worklogService.getUserWorklogs(userId, month),
    enabled: !!userId,
  });
};

