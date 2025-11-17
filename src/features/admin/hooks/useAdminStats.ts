import { useQuery } from '@tanstack/react-query';
import { adminService, AdminStats, AdminFilters } from '../services/adminService';

export const useAdminStats = (filters?: AdminFilters) => {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats', filters],
    queryFn: () => adminService.getAdminStats(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for real-time feel
  });
};

