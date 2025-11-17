import { useQuery } from '@tanstack/react-query';
import { adminService, DailyHoursData, AdminFilters } from '../services/adminService';

export const useAdminDailyHours = (filters?: AdminFilters) => {
  return useQuery<DailyHoursData[]>({
    queryKey: ['admin', 'daily-hours', filters],
    queryFn: () => adminService.getDailyHoursLast30Days(filters),
    staleTime: 60000, // 1 minute
  });
};

