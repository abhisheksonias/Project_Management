import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminWorklog, UserWithNoLog, adminWorklogService } from '../services/adminWorklogService';

export const useAdminWorklogs = () => {
  return useQuery<AdminWorklog[]>({
    queryKey: ['admin', 'worklogs'],
    queryFn: () => adminWorklogService.getAllWorklogs(),
    staleTime: 60000,
  });
};

export const useTodaysWorklogs = (date: Date, projectId?: string | null, userId?: string | null) => {
  return useQuery<AdminWorklog[]>({
    queryKey: ['admin', 'worklogs', 'today', date.toISOString(), projectId, userId],
    queryFn: () => adminWorklogService.getTodaysWorklogs(date, projectId, userId),
    staleTime: 30000,
  });
};

export const useRecentWorklogs = (days: number = 7, projectId?: string | null, userId?: string | null) => {
  return useQuery<AdminWorklog[]>({
    queryKey: ['admin', 'worklogs', 'recent', days, projectId, userId],
    queryFn: () => adminWorklogService.getRecentWorklogs(days, projectId, userId),
    staleTime: 60000,
  });
};

export const useWorklogsByDateRange = (
  startDate: Date | null,
  endDate: Date | null,
  projectId?: string | null,
  userId?: string | null
) => {
  return useQuery<AdminWorklog[]>({
    queryKey: ['admin', 'worklogs', 'date-range', startDate?.toISOString(), endDate?.toISOString(), projectId, userId],
    queryFn: () => {
      if (!startDate || !endDate) {
        // Fallback to last 7 days if no date range provided
        return adminWorklogService.getRecentWorklogs(7, projectId, userId);
      }
      return adminWorklogService.getWorklogsByDateRange(startDate, endDate, projectId, userId);
    },
    enabled: !!startDate && !!endDate,
    staleTime: 60000,
  });
};

export const useUsersWithNoLogs = (date: Date) => {
  return useQuery<UserWithNoLog[]>({
    queryKey: ['admin', 'users', 'no-logs', date.toISOString()],
    queryFn: () => adminWorklogService.getUsersWithNoLogs(date),
    staleTime: 30000,
  });
};

export const useCreateWorklogForUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      user_id: string;
      task_id: string;
      project_id: string;
      hours: string;
      note?: string | null;
      created_at: string;
      added_by: string;
    }) => adminWorklogService.createWorklogForUser(data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      const date = new Date(variables.created_at);
      queryClient.invalidateQueries({ queryKey: ['admin', 'worklogs', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'worklogs', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'no-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'worklogs', 'date-range'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'hours-summary'] });
    },
  });
};

export const useUpdateWorklog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worklogId, data }: {
      worklogId: string;
      data: {
        user_id?: string;
        task_id?: string;
        project_id?: string;
        hours?: string;
        note?: string | null;
        created_at?: string;
      };
    }) => adminWorklogService.updateWorklog(worklogId, data),
    onSuccess: () => {
      // Invalidate all worklog queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'hours-summary'] });
    },
  });
};

export const useDeleteWorklog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (worklogId: string) => adminWorklogService.deleteWorklog(worklogId),
    onSuccess: () => {
      // Invalidate all worklog queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['milestones', 'hours-summary'] });
    },
  });
};
