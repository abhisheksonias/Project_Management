import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/adminService';

export const useAdminWorkCalendar = (month: Date) => {
  return useQuery({
    queryKey: ['admin', 'work-calendar', month.getFullYear(), month.getMonth()],
    queryFn: () => adminService.getAllWorklogsForMonth(month),
    staleTime: 30000, // 30 seconds
  });
};

