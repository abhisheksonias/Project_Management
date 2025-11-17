import { useQuery } from '@tanstack/react-query';
import { worklogService, Worklog } from '@/features/worklogs/services/worklogService';

export const useWorklogHistoryQuery = (
  userId: string,
  startDate: Date,
  endDate: Date
) => {
  // Use date strings in query key to prevent unnecessary refetches
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  return useQuery<Worklog[]>({
    queryKey: ['worklog-history', userId, startDateStr, endDateStr],
    queryFn: () => worklogService.getWorklogHistory(userId, startDate, endDate),
    enabled: !!userId,
  });
};

