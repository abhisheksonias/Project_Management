import { useQuery } from '@tanstack/react-query';
import { reportService, ReportFilters } from '../services/reportService';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useReportData = (userId: string, filters: ReportFilters) => {
  // Serialize filters for query key to avoid Date object issues
  const queryKey = [
    'reports',
    userId,
    {
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
      projectId: filters.projectId,
      billableType: filters.billableType,
    },
  ];

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      if (!filters.startDate || !filters.endDate) {
        throw new Error('Date range is required');
      }
      return reportService.getReportData(userId, filters);
    },
    enabled: !!userId && !!filters.startDate && !!filters.endDate,
    retry: 1,
  });
};

export const getDefaultFilters = (): ReportFilters => {
  const now = new Date();
  return {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
    projectId: 'all',
    billableType: 'all',
  };
};

