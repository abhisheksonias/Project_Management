import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminUserManagementService,
  UserWithDetails,
  UserMonthHours,
  UserUnpaidLeaves,
  UserLeave,
  HourlyCostResult,
  CreateUserData,
  UpdateUserData,
} from '../services/adminUserManagementService';

/**
 * Get paginated users with filters
 */
export const useUsersPaginated = (params: {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean | null;
  department?: string | null;
}) => {
  return useQuery({
    queryKey: ['admin', 'users', 'paginated', params],
    queryFn: () => adminUserManagementService.getUsersPaginated(params),
    staleTime: 30000,
  });
};

/**
 * Get all users (for filters)
 */
export const useAllUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users', 'all'],
    queryFn: () => adminUserManagementService.getAllUsers(),
    staleTime: 300000,
  });
};

/**
 * Get unique departments
 */
export const useDepartments = () => {
  return useQuery({
    queryKey: ['admin', 'users', 'departments'],
    queryFn: () => adminUserManagementService.getDepartments(),
    staleTime: 300000,
  });
};

/**
 * Get user month hours for selected month and user IDs
 */
export const useUserMonthHours = (monthDate: Date, userIds: string[]) => {
  return useQuery({
    queryKey: ['admin', 'users', 'month-hours', monthDate.toISOString(), userIds.sort().join(',')],
    queryFn: () => adminUserManagementService.getUserMonthHours(monthDate, userIds),
    enabled: userIds.length > 0,
    staleTime: 30000,
  });
};

/**
 * Get unpaid leaves for users in a month
 */
export const useUserUnpaidLeaves = (monthDate: Date, userIds: string[]) => {
  return useQuery({
    queryKey: ['admin', 'users', 'unpaid-leaves', monthDate.toISOString(), userIds.sort().join(',')],
    queryFn: () => adminUserManagementService.getUserUnpaidLeaves(monthDate, userIds),
    enabled: userIds.length > 0,
    staleTime: 30000,
  });
};

/**
 * Get hourly cost for a single user (RPC call)
 */
export const useHourlyCostForUser = (userId: string | null, monthDate: Date) => {
  return useQuery({
    queryKey: ['admin', 'users', 'hourly-cost', userId, monthDate.toISOString()],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return adminUserManagementService.getHourlyCostForUser(userId, monthDate);
    },
    enabled: !!userId,
    staleTime: 60000,
  });
};

/**
 * Create user mutation
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => adminUserManagementService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

/**
 * Update user mutation
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserData }) =>
      adminUserManagementService.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

/**
 * Delete user mutation
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminUserManagementService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

/**
 * Bulk update active status mutation
 */
export const useBulkUpdateActiveStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userIds, isActive }: { userIds: string[]; isActive: boolean }) =>
      adminUserManagementService.bulkUpdateActiveStatus(userIds, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

/**
 * Get user leaves for a month
 */
export const useUserLeaves = (userId: string | null, monthDate: Date) => {
  return useQuery({
    queryKey: ['admin', 'users', 'leaves', userId, monthDate.toISOString()],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return adminUserManagementService.getUserLeaves(userId, monthDate);
    },
    enabled: !!userId,
    staleTime: 30000,
  });
};

/**
 * Add user leave mutation
 */
export const useAddUserLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; leave_date: string; is_paid: boolean }) =>
      adminUserManagementService.addUserLeave(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'leaves', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'unpaid-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'paginated'] });
    },
  });
};

/**
 * Delete user leave mutation
 */
export const useDeleteUserLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leaveId, userId }: { leaveId: string; userId: string }) =>
      adminUserManagementService.deleteUserLeave(leaveId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'leaves', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'unpaid-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'paginated'] });
    },
  });
};

/**
 * Get user recent projects
 */
export const useUserRecentProjects = (userId: string | null) => {
  return useQuery({
    queryKey: ['admin', 'users', 'recent-projects', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return adminUserManagementService.getUserRecentProjects(userId);
    },
    enabled: !!userId,
    staleTime: 60000,
  });
};

