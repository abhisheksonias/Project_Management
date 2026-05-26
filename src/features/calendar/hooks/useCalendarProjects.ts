import { useQuery } from '@tanstack/react-query';
import { projectService, Project } from '@/features/projects/services/projectService';

export const useCalendarProjects = (userId: string) => {
  return useQuery<Project[]>({
    queryKey: ['projects', userId],
    queryFn: () => projectService.getUserProjects(userId),
    enabled: !!userId,
  });
};

