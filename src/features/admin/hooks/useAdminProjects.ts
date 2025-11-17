import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import { adminProjectService } from '../services/adminProjectService';
import { Project, ProjectStats } from '@/features/projects/services/projectService';

// Hook for filter dropdown (returns only id and name)
export const useAdminProjectsForFilter = () => {
  return useQuery({
    queryKey: ['admin', 'projects', 'filter'],
    queryFn: () => adminService.getAllProjects(),
    staleTime: 300000, // 5 minutes - projects don't change frequently
  });
};

// Hook for full project list with all details
export const useAdminProjects = () => {
  return useQuery<Project[]>({
    queryKey: ['admin', 'projects'],
    queryFn: () => adminProjectService.getAllProjects(),
    staleTime: 30000, // 30 seconds
  });
};

export const useAdminProject = (projectId: string | null) => {
  return useQuery<Project | null>({
    queryKey: ['admin', 'project', projectId],
    queryFn: () => (projectId ? adminProjectService.getProjectById(projectId) : Promise.resolve(null)),
    enabled: !!projectId,
    staleTime: 30000,
  });
};

export const useAdminProjectStats = () => {
  return useQuery<ProjectStats>({
    queryKey: ['admin', 'project-stats'],
    queryFn: () => adminProjectService.getProjectStats(),
    staleTime: 60000, // 1 minute
  });
};
