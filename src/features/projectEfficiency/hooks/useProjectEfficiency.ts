import { useQuery } from '@tanstack/react-query';
import { projectEfficiencyService, ProjectEfficiencyStats, ProjectDailyHoursData, HoursByUserData, HoursByTaskData, ProjectRecentWorklog } from '../services/projectEfficiencyService';

export const useProjectEfficiencyStats = (
  projectId: string | undefined,
  enabled: boolean = true
) => {
  return useQuery<ProjectEfficiencyStats>({
    queryKey: [
      'project-efficiency', 
      'stats', 
      projectId || 'none',
      'all-time'
    ],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getProjectEfficiencyStats(projectId);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
  });
};

export const useProjectDailyHours = (
  projectId: string | undefined,
  enabled: boolean = true
) => {
  return useQuery<ProjectDailyHoursData[]>({
    queryKey: [
      'project-efficiency', 
      'daily-hours', 
      projectId || 'none',
      'all-time'
    ],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getProjectDailyHours(projectId);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
  });
};

export const useHoursByUser = (
  projectId: string | undefined,
  enabled: boolean = true
) => {
  return useQuery<HoursByUserData[]>({
    queryKey: [
      'project-efficiency', 
      'hours-by-user', 
      projectId || 'none',
      'all-time'
    ],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getHoursByUser(projectId);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
  });
};

export const useHoursByTask = (
  projectId: string | undefined,
  enabled: boolean = true
) => {
  return useQuery<HoursByTaskData[]>({
    queryKey: [
      'project-efficiency',
      'hours-by-task',
      projectId || 'none',
      'all-time',
    ],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getHoursByTask(projectId);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
  });
};

export const useProjectRecentWorklogs = (
  projectId: string | undefined,
  limit: number = 10,
  enabled: boolean = true
) => {
  return useQuery<ProjectRecentWorklog[]>({
    queryKey: ['project-efficiency', 'recent-worklogs', projectId || 'none', limit],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getProjectRecentWorklogs(projectId, limit);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
  });
};

