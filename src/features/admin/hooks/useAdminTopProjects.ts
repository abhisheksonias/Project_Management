import { useQuery } from '@tanstack/react-query';
import { adminService, ProjectWithHours, AdminFilters } from '../services/adminService';

export const useAdminTopProjects = (limit: number = 5, filters?: AdminFilters) => {
  return useQuery<ProjectWithHours[]>({
    queryKey: ['admin', 'top-projects', limit, filters],
    queryFn: () => adminService.getTopProjects(limit, filters),
    staleTime: 60000, // 1 minute
  });
};

