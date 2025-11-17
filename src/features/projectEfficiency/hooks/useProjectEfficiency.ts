import { useQuery } from '@tanstack/react-query';
import { projectEfficiencyService, ProjectEfficiencyStats, ProjectDailyHoursData, HoursByUserData, ProjectRecentWorklog } from '../services/projectEfficiencyService';

export const useProjectEfficiencyStats = (
  projectId: string | undefined,
  dateRange: string = 'last-30-days',
  customStart?: Date,
  customEnd?: Date,
  enabled: boolean = true
) => {
  return useQuery<ProjectEfficiencyStats>({
    queryKey: [
      'project-efficiency', 
      'stats', 
      projectId || 'none', 
      dateRange, 
      customStart?.toISOString() || 'none', 
      customEnd?.toISOString() || 'none'
    ],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getProjectEfficiencyStats(projectId, dateRange, customStart, customEnd);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
  });
};

export const useProjectDailyHours = (
  projectId: string | undefined,
  dateRange: string = 'last-30-days',
  customStart?: Date,
  customEnd?: Date,
  enabled: boolean = true
) => {
  return useQuery<ProjectDailyHoursData[]>({
    queryKey: [
      'project-efficiency', 
      'daily-hours', 
      projectId || 'none', 
      dateRange, 
      customStart?.toISOString() || 'none', 
      customEnd?.toISOString() || 'none'
    ],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getProjectDailyHours(projectId, dateRange, customStart, customEnd);
    },
    enabled: enabled && !!projectId,
    staleTime: 30000,
  });
};

export const useHoursByUser = (
  projectId: string | undefined,
  dateRange: string = 'last-30-days',
  customStart?: Date,
  customEnd?: Date,
  enabled: boolean = true
) => {
  return useQuery<HoursByUserData[]>({
    queryKey: [
      'project-efficiency', 
      'hours-by-user', 
      projectId || 'none', 
      dateRange, 
      customStart?.toISOString() || 'none', 
      customEnd?.toISOString() || 'none'
    ],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return projectEfficiencyService.getHoursByUser(projectId, dateRange, customStart, customEnd);
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

