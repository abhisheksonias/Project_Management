import { useQuery } from '@tanstack/react-query';
import { projectService, Project } from '@/features/projects/services/projectService';

export const useDashboardProjects = (userId: string) => {
  return useQuery<Project[]>({
    queryKey: ['dashboard-projects', userId],
    queryFn: () => projectService.getUserProjects(userId),
    enabled: !!userId,
  });
};

export const useDashboardProjectStats = (userId: string) => {
  return useQuery({
    queryKey: ['dashboard-project-stats', userId],
    queryFn: () => projectService.getProjectStats(userId),
    enabled: !!userId,
  });
};

