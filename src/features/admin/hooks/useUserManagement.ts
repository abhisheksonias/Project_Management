import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementService, CreateLeaveData, CreateSalaryPeriodData, UpdateUserData } from '../services/userManagementService';
import { format } from 'date-fns';

export const useAllUsers = (month?: Date) => {
  return useQuery({
    queryKey: ['user-management', 'users', month ? format(month, 'yyyy-MM') : 'all'],
    queryFn: () => userManagementService.getAllUsers(month),
    staleTime: 30000,
  });
};

export const useUserSalaryPeriods = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-management', 'salary-periods', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return userManagementService.getUserSalaryPeriods(userId);
    },
    enabled: !!userId,
    staleTime: 30000,
  });
};

export const useUserLeaves = (userId: string | null, month: Date) => {
  return useQuery({
    queryKey: ['user-management', 'leaves', userId, format(month, 'yyyy-MM')],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return userManagementService.getUserLeaves(userId, month);
    },
    enabled: !!userId,
    staleTime: 30000,
  });
};

export const useUserMonthStats = (userId: string | null, month: Date) => {
  return useQuery({
    queryKey: ['user-management', 'month-stats', userId, format(month, 'yyyy-MM')],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return userManagementService.getUserMonthStats(userId, month);
    },
    enabled: !!userId,
    staleTime: 30000,
  });
};

export const useUserWorklogsForMonth = (userId: string | null, month: Date) => {
  return useQuery({
    queryKey: ['user-management', 'worklogs', userId, format(month, 'yyyy-MM')],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return userManagementService.getUserWorklogsForMonth(userId, month);
    },
    enabled: !!userId,
    staleTime: 30000,
  });
};

export const useUsersMonthStats = (userIds: string[], month: Date) => {
  return useQuery({
    queryKey: ['user-management', 'users-month-stats', userIds, format(month, 'yyyy-MM')],
    queryFn: () => userManagementService.getUsersMonthStats(userIds, month),
    enabled: userIds.length > 0,
    staleTime: 30000,
  });
};

export const useUpsertSalaryPeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalaryPeriodData) => userManagementService.upsertSalaryPeriod(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-management', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['user-management', 'salary-periods', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user-management', 'month-stats'] });
    },
  });
};

export const useCreateLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeaveData) => userManagementService.createLeave(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-management', 'leaves'] });
      queryClient.invalidateQueries({ queryKey: ['user-management', 'month-stats'] });
    },
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leaveId: string) => userManagementService.deleteLeave(leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-management', 'leaves'] });
      queryClient.invalidateQueries({ queryKey: ['user-management', 'month-stats'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserData }) =>
      userManagementService.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-management', 'users'] });
    },
  });
};

