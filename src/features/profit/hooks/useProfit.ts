import { useQuery } from '@tanstack/react-query';
import { profitService, ProjectProfitParams, ProjectProfit, UserProjectProfit } from '../services/profitService';

/**
 * Get paginated projects with profit data
 */
export const useProjectsProfit = (params: ProjectProfitParams = {}) => {
  return useQuery({
    queryKey: ['profit', 'projects', params],
    queryFn: () => profitService.getProjectsProfit(params),
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Get user profit breakdown for a specific project
 */
export const useUserProjectProfit = (projectId: string | null) => {
  return useQuery<UserProjectProfit[]>({
    queryKey: ['profit', 'user-project', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getUserProjectProfit(projectId);
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
};

/**
 * Get single project profit details
 */
export const useProjectProfit = (projectId: string | null) => {
  return useQuery<ProjectProfit | null>({
    queryKey: ['profit', 'project', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getProjectProfit(projectId);
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
};

