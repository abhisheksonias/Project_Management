import { useQuery } from '@tanstack/react-query';
import { profitService, ProjectProfitParams, ProjectProfit, UserProjectProfit, MonthlyProfitTrend } from '../services/profitService';

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
 * @param projectId - Project ID
 * @param month - Optional month filter (if provided, calculates profit for that month only)
 */
export const useUserProjectProfit = (projectId: string | null, month?: Date | null) => {
  return useQuery<UserProjectProfit[]>({
    queryKey: ['profit', 'user-project', projectId, month ? `${month.getFullYear()}-${month.getMonth()}` : 'overall'],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getUserProjectProfit(projectId, month || undefined);
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

/**
 * Get monthly profit trend for a project
 */
export const useProjectMonthlyTrend = (projectId: string | null, months: number = 6) => {
  return useQuery<MonthlyProfitTrend[]>({
    queryKey: ['profit', 'monthly-trend', projectId, months],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getProjectMonthlyTrend(projectId, months);
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
};

