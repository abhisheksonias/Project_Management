import { useQuery } from '@tanstack/react-query';
import { efficiencyService, EfficiencyStats, DailyHoursData, HoursByProjectData, RecentWorklog } from '../services/efficiencyService';

export const useEfficiencyStats = (
  userId?: string,
  dateRange: string = 'last-30-days',
  customStart?: Date,
  customEnd?: Date,
  enabled: boolean = true
) => {
  return useQuery<EfficiencyStats>({
    queryKey: [
      'efficiency', 
      'stats', 
      userId || 'all', 
      dateRange, 
      customStart?.toISOString() || 'none', 
      customEnd?.toISOString() || 'none'
    ],
    queryFn: () => efficiencyService.getEfficiencyStats(userId, dateRange, customStart, customEnd),
    enabled,
    staleTime: 30000, // 30 seconds - shorter for filter responsiveness
  });
};

export const useDailyHours = (
  userId: string | undefined,
  dateRange: string = 'last-30-days',
  customStart?: Date,
  customEnd?: Date,
  enabled: boolean = true
) => {
  return useQuery<DailyHoursData[]>({
    queryKey: [
      'efficiency', 
      'daily-hours', 
      userId || 'none', 
      dateRange, 
      customStart?.toISOString() || 'none', 
      customEnd?.toISOString() || 'none'
    ],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return efficiencyService.getDailyHours(userId, dateRange, customStart, customEnd);
    },
    enabled: enabled && !!userId,
    staleTime: 30000,
  });
};

export const useHoursByProject = (
  userId: string | undefined,
  dateRange: string = 'last-30-days',
  customStart?: Date,
  customEnd?: Date,
  enabled: boolean = true
) => {
  return useQuery<HoursByProjectData[]>({
    queryKey: [
      'efficiency', 
      'hours-by-project', 
      userId || 'all', 
      dateRange, 
      customStart?.toISOString() || 'none', 
      customEnd?.toISOString() || 'none'
    ],
    queryFn: () => efficiencyService.getHoursByProject(userId, dateRange, customStart, customEnd),
    enabled,
    staleTime: 30000,
  });
};

export const useRecentWorklogs = (
  userId: string | undefined,
  limit: number = 10,
  enabled: boolean = true
) => {
  return useQuery<RecentWorklog[]>({
    queryKey: ['efficiency', 'recent-worklogs', userId, limit],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return efficiencyService.getRecentWorklogs(userId, limit);
    },
    enabled: enabled && !!userId,
    staleTime: 60000,
  });
};

