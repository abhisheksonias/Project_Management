import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  monthly_salary: number | null;
  salary_currency: string;
  is_active: boolean | null;
  rank: string | null;
  created_at: string | null;
}

export interface UserMonthHours {
  user_id: string;
  month_start: string;
  total_hours: number;
}

export interface UserLeave {
  id: string;
  user_id: string;
  leave_date: string;
  is_paid: boolean;
  leave_type: 'full' | 'half';
  created_at: string;
}

export interface UserUnpaidLeaves {
  user_id: string;
  unpaid_leaves_count: number;
}

export interface UserWorklogEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  created_at: string;
  hours: string;
  hours_num: number;
  note: string | null;
  task?: {
    id: string | null;
    name: string | null;
    status?: string | null;
  } | null;
  project?: {
    id: string | null;
    name: string | null;
  } | null;
}

export interface UserMonthlyActivity {
  leaves: UserLeave[];
  worklogs: UserWorklogEntry[];
}

export interface HourlyCostResult {
  user_id: string;
  month_start: string;
  monthly_salary: number | null;
  unpaid_leaves: number;
  total_hours: number | null;
  hourly_cost: number | null;
}

export interface CreateUserData {
  name: string;
  email: string;
  role?: string | null;
  department?: string | null;
  monthly_salary?: number | null;
  salary_currency?: string;
  is_active?: boolean | null;
  rank?: string | null;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string | null;
  department?: string | null;
  monthly_salary?: number | null;
  salary_currency?: string;
  is_active?: boolean | null;
  rank?: string | null;
  periodMonth?: Date | null; // Optional: month for which salary period should be created
}

class AdminUserManagementService {
  /**
   * Get paginated users with filters
   */
  async getUsersPaginated(params: {
    page: number;
    pageSize: number;
    search?: string;
    isActive?: boolean | null;
    department?: string | null;
  }): Promise<{ users: UserWithDetails[]; total: number }> {
    // First, get the total count with all filters applied
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .or('role.neq.Admin,role.is.null');

    if (params.search) {
      countQuery = countQuery.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    if (params.isActive !== null && params.isActive !== undefined) {
      countQuery = countQuery.eq('is_active', params.isActive);
    }

    if (params.department) {
      countQuery = countQuery.eq('department', params.department);
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    // Now get the paginated data
    let query = supabase
      .from('users')
      .select('id, name, email, role, department, monthly_salary, salary_currency, is_active, rank, created_at')
      .order('name', { ascending: true });

    // Exclude Admin users - filter where role is not 'Admin' or role is null
    query = query.or('role.neq.Admin,role.is.null');

    // Apply filters
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    if (params.isActive !== null && params.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }

    if (params.department) {
      query = query.eq('department', params.department);
    }

    // Apply pagination
    const from = (params.page - 1) * params.pageSize;
    const to = from + params.pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) throw error;

    // Filter out Admin users (case-insensitive) as a safety measure
    const filteredData = (data || []).filter(
      (user) => !user.role || user.role.toLowerCase() !== 'admin'
    ) as UserWithDetails[];

    // Calculate accurate total by subtracting admin users from count
    // We approximate by using the count minus any admin users that might have been included
    const adminCountInPage = (data || []).length - filteredData.length;
    const estimatedTotal = count ? Math.max(0, count - adminCountInPage) : filteredData.length;

    return {
      users: filteredData,
      total: estimatedTotal,
    };
  }

  /**
   * Get all users (for filters and dropdowns)
   */
  async getAllUsers(): Promise<UserWithDetails[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, monthly_salary, salary_currency, is_active, rank, created_at')
      .or('role.neq.Admin,role.is.null')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Filter out Admin users (case-insensitive) as a safety measure
    return (data || []).filter(
      (user) => !user.role || user.role.toLowerCase() !== 'admin'
    ) as UserWithDetails[];
  }

  /**
   * Get unique departments for filter dropdown
   */
  async getDepartments(): Promise<string[]> {
    const { data, error } = await supabase
      .from('users')
      .select('department, role')
      .not('department', 'is', null)
      .or('role.neq.Admin,role.is.null');

    if (error) throw error;

    // Filter out Admin users (case-insensitive) and get unique departments
    const filteredData = (data || []).filter(
      (user) => !user.role || user.role.toLowerCase() !== 'admin'
    );
    
    const uniqueDepartments = Array.from(
      new Set(filteredData.map((u) => u.department).filter(Boolean) as string[])
    );
    return uniqueDepartments.sort();
  }

  /**
   * Get user month hours from view for selected month and user IDs
   */
  async getUserMonthHours(
    monthDate: Date,
    userIds: string[]
  ): Promise<UserMonthHours[]> {
    if (userIds.length === 0) return [];

    const monthStart = startOfMonth(monthDate);
    // Format as YYYY-MM-DD for date comparison
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('user_month_hours')
      .select('user_id, month_start, total_hours')
      .in('user_id', userIds)
      .eq('month_start', monthStartStr);

    if (error) {
      console.error('Error fetching user month hours:', error);
      throw error;
    }

    // Ensure total_hours is a number and convert if needed
    const result = (data || []).map((item) => ({
      user_id: item.user_id,
      month_start: item.month_start,
      total_hours: typeof item.total_hours === 'string' 
        ? parseFloat(item.total_hours) 
        : Number(item.total_hours) || 0,
    })) as UserMonthHours[];

    return result;
  }

  /**
   * Get unpaid leaves count for users in a month
   */
  async getUserUnpaidLeaves(
    monthDate: Date,
    userIds: string[]
  ): Promise<UserUnpaidLeaves[]> {
    if (userIds.length === 0) return [];

    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const { data, error } = await supabase
      .from('user_leaves')
      .select('user_id, leave_date, is_paid, leave_type')
      .in('user_id', userIds)
      .eq('is_paid', false)
      .gte('leave_date', monthStart.toISOString().split('T')[0])
      .lte('leave_date', monthEnd.toISOString().split('T')[0]);

    if (error) throw error;

    // Group by user_id and count
    const counts = new Map<string, number>();
    (data || []).forEach((leave) => {
      const current = counts.get(leave.user_id) || 0;
      const weight = leave.leave_type === 'half' ? 0.5 : 1;
      counts.set(leave.user_id, current + weight);
    });

    return Array.from(counts.entries()).map(([user_id, unpaid_leaves_count]) => ({
      user_id,
      unpaid_leaves_count,
    }));
  }

  /**
   * Get hourly cost for a user and month via RPC
   */
  async getHourlyCostForUser(
    userId: string,
    monthDate: Date
  ): Promise<HourlyCostResult | null> {
    const monthStart = startOfMonth(monthDate).toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('hourly_cost_for_user_month', {
      p_user_id: userId,
      p_month_date: monthStart,
    });

    if (error) throw error;

    if (!data || data.length === 0) return null;

    return data[0] as HourlyCostResult;
  }

  /**
   * Calculate hourly cost client-side (faster for bulk)
   */
  calculateHourlyCost(
    monthlySalary: number | null,
    unpaidLeaves: number,
    totalHours: number | null,
    monthDate: Date
  ): number | null {
    if (!monthlySalary || !totalHours || totalHours <= 0) {
      return null;
    }

    const daysInMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    ).getDate();

    const dailySalary = monthlySalary / daysInMonth;
    const finalSalary = Math.max(0, monthlySalary - dailySalary * unpaidLeaves);

    return Number((finalSalary / totalHours).toFixed(2));
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<UserWithDetails> {
    const { data: createdUser, error } = await supabase
      .from('users')
      .insert({
        name: data.name,
        email: data.email,
        role: data.role || null,
        department: data.department || null,
        monthly_salary: data.monthly_salary || null,
        salary_currency: data.salary_currency || 'INR',
        is_active: data.is_active !== undefined ? data.is_active : true,
        rank: data.rank || null,
      })
      .select()
      .single();

    if (error) throw error;
    return createdUser as UserWithDetails;
  }

  /**
   * Update user
   * On salary change: automatically inserts/updates entry in user_salary_periods
   * Uses periodMonth if provided, otherwise uses current month
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<void> {
    const { periodMonth, monthly_salary, ...userUpdateData } = data;

    // If salary is being updated, create/update/delete salary period
    if (monthly_salary !== undefined) {
      // Use provided periodMonth or default to current month
      const effectiveMonth = periodMonth || new Date();
      const monthStart = startOfMonth(effectiveMonth);
      const periodMonthStr = format(monthStart, 'yyyy-MM-dd');

      // Check if entry already exists for this user and month
      const { data: existingPeriod, error: checkError } = await supabase
        .from('user_salary_periods')
        .select('id')
        .eq('user_id', userId)
        .eq('period_month', periodMonthStr)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, other errors should be thrown
        throw checkError;
      }

      if (monthly_salary === null || monthly_salary === 0) {
        // If salary is set to null or 0, delete the period entry if it exists
        if (existingPeriod) {
          const { error: deleteError } = await supabase
            .from('user_salary_periods')
            .delete()
            .eq('id', existingPeriod.id);

          if (deleteError) throw deleteError;
        }
      } else {
        // Salary is not null, create or update period entry
        const note = existingPeriod
          ? `Salary updated on ${format(new Date(), 'yyyy-MM-dd')}`
          : `Salary set to ${monthly_salary.toLocaleString()} effective from ${format(monthStart, 'MMMM yyyy')}`;

        if (existingPeriod) {
          // Update existing period
          const { error: updatePeriodError } = await supabase
            .from('user_salary_periods')
            .update({
              monthly_salary: monthly_salary,
              note: note,
            })
            .eq('id', existingPeriod.id);

          if (updatePeriodError) throw updatePeriodError;
        } else {
          // Create new period entry
          const { error: insertPeriodError } = await supabase
            .from('user_salary_periods')
            .insert({
              user_id: userId,
              period_month: periodMonthStr,
              monthly_salary: monthly_salary,
              note: note,
            });

          if (insertPeriodError) throw insertPeriodError;
        }
      }
    }

    // Optionally update users.monthly_salary (for convenience/current value)
    const { error } = await supabase
      .from('users')
      .update({
        ...userUpdateData,
        monthly_salary: monthly_salary !== undefined ? monthly_salary : undefined,
      })
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) throw error;
  }

  /**
   * Bulk update user active status
   */
  async bulkUpdateActiveStatus(userIds: string[], isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .in('id', userIds);

    if (error) throw error;
  }

  /**
   * Get worklogs for a user within a month
   */
  async getUserWorklogsForMonth(userId: string, monthDate: Date): Promise<UserWorklogEntry[]> {
    const start = startOfMonth(monthDate).toISOString();
    const end = endOfMonth(monthDate).toISOString();

    const { data, error } = await supabase
      .from('work_logs')
      .select(
        `
        id,
        user_id,
        task_id,
        project_id,
        created_at,
        hours,
        hours_num,
        note,
        tasks (
          id,
          name,
          status
        ),
        projects (
          id,
          name
        )
      `
      )
      .eq('user_id', userId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      user_id: item.user_id,
      task_id: item.task_id,
      project_id: item.project_id,
      created_at: item.created_at,
      hours: item.hours,
      hours_num: typeof item.hours_num === 'number' ? item.hours_num : Number(item.hours_num) || 0,
      note: item.note,
      task: item.tasks
        ? {
            id: item.tasks.id,
            name: item.tasks.name,
            status: item.tasks.status,
          }
        : null,
      project: item.projects
        ? {
            id: item.projects.id,
            name: item.projects.name,
          }
        : null,
    })) as UserWorklogEntry[];
  }

  /**
   * Get combined monthly activity (leaves + worklogs)
   */
  async getUserMonthlyActivity(userId: string, monthDate: Date): Promise<UserMonthlyActivity> {
    const [leaves, worklogs] = await Promise.all([
      this.getUserLeaves(userId, monthDate),
      this.getUserWorklogsForMonth(userId, monthDate),
    ]);

    return { leaves, worklogs };
  }

  /**
   * Get user leaves for a month
   */
  async getUserLeaves(userId: string, monthDate: Date): Promise<UserLeave[]> {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const { data, error } = await supabase
      .from('user_leaves')
      .select('id, user_id, leave_date, is_paid, leave_type, created_at')
      .eq('user_id', userId)
      .gte('leave_date', monthStart.toISOString().split('T')[0])
      .lte('leave_date', monthEnd.toISOString().split('T')[0])
      .order('leave_date', { ascending: true });

    if (error) throw error;
    return (data || []) as UserLeave[];
  }

  /**
   * Add user leave
   */
  async addUserLeave(data: {
    user_id: string;
    leave_date: string;
    is_paid: boolean;
    leave_type?: 'full' | 'half';
  }): Promise<UserLeave> {
    const { data: leave, error } = await supabase
      .from('user_leaves')
      .insert({
        user_id: data.user_id,
        leave_date: data.leave_date,
        is_paid: data.is_paid,
        leave_type: data.leave_type || 'full',
      })
      .select()
      .single();

    if (error) throw error;
    return leave as UserLeave;
  }

  /**
   * Delete user leave
   */
  async deleteUserLeave(leaveId: string): Promise<void> {
    const { error } = await supabase.from('user_leaves').delete().eq('id', leaveId);

    if (error) throw error;
  }

  /**
   * Get recent projects for a user (from work_logs)
   */
  async getUserRecentProjects(userId: string, limit: number = 5): Promise<Array<{ project_id: string; project_name: string }>> {
    const { data, error } = await supabase
      .from('work_logs')
      .select('project_id, projects(name)')
      .eq('user_id', userId)
      .not('project_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 10); // Get more to account for duplicates

    if (error) throw error;

    // Get unique projects
    const projectMap = new Map<string, string>();
    (data || []).forEach((log) => {
      if (log.project_id && (log.projects as any)?.name) {
        if (!projectMap.has(log.project_id)) {
          projectMap.set(log.project_id, (log.projects as any).name);
        }
      }
    });

    return Array.from(projectMap.entries())
      .slice(0, limit)
      .map(([project_id, project_name]) => ({ project_id, project_name }));
  }
}

export const adminUserManagementService = new AdminUserManagementService();

