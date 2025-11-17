import { useQuery } from '@tanstack/react-query';
import { reportService, ReportFilters } from '../services/reportService';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useReportData = (userId: string, filters: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', userId, filters],
    queryFn: () => reportService.getReportData(userId, filters),
    enabled: !!userId,
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

