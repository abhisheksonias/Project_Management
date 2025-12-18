import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, format } from 'date-fns';

export interface UserLeave {
  id: string;
  user_id: string;
  leave_date: string;
  is_paid: boolean;
  leave_type: 'full' | 'half';
  created_at: string;
}

export interface UserSalaryPeriod {
  id: string;
  user_id: string;
  period_month: string; // Date string
  monthly_salary: number;
  note: string | null;
  created_at: string;
}

export interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  is_active: boolean | null;
  rank: string | null;
  created_at: string | null;
  avatar_url: string | null;
  current_salary: number | null; // Latest salary from user_salary_periods
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string | null;
  department?: string | null;
  is_active?: boolean | null;
  rank?: string | null;
}

export interface CreateLeaveData {
  user_id: string;
  leave_date: string;
  is_paid: boolean;
  leave_type: 'full' | 'half';
}

export interface CreateSalaryPeriodData {
  user_id: string;
  period_month: string; // Date string (first day of month)
  monthly_salary: number;
  note?: string | null;
}

export interface UserMonthStats {
  user_id: string;
  month_start: string;
  total_hours: number;
  unpaid_leaves: number;
  monthly_salary: number;
  net_salary: number;
  days_in_month: number;
  hourly_price?: number | null;
  daily_salary?: number | null;
  deduction_amount?: number | null;
}

class UserManagementService {
  /**
   * Get all users with salary for a specific month (excluding admin users)
   */
  async getAllUsers(month?: Date): Promise<UserWithDetails[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, is_active, rank, created_at, avatar_url')
      .not('role', 'eq', 'admin')
      .not('role', 'eq', 'Admin')
      .order('name', { ascending: true });

    if (error) throw error;

    const userIds = (users || []).map((u) => u.id);
    if (userIds.length === 0) return [];

    // If month is provided, get salary for that specific month
    if (month) {
      const monthStart = startOfMonth(month);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');

      const { data: salaryPeriods, error: salaryError } = await supabase
        .from('user_salary_periods')
        .select('user_id, monthly_salary')
        .in('user_id', userIds)
        .eq('period_month', monthStartStr);

      if (salaryError) {
        console.error('Error fetching salary periods:', salaryError);
      }

      // Create map of salary per user for the selected month
      const salaryMap = new Map<string, number>();
      (salaryPeriods || []).forEach((sp: any) => {
        salaryMap.set(sp.user_id, sp.monthly_salary);
      });

      return (users || []).map((user) => ({
        ...user,
        current_salary: salaryMap.get(user.id) || 0, // Return 0 if no salary for the month
      }));
    }

    // If no month provided, get latest salary (for backward compatibility)
    const { data: salaryPeriods, error: salaryError } = await supabase
      .from('user_salary_periods')
      .select('user_id, monthly_salary, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (salaryError) {
      console.error('Error fetching salary periods:', salaryError);
    }

    // Create map of latest salary per user
    const salaryMap = new Map<string, number>();
    const processedUsers = new Set<string>();
    (salaryPeriods || []).forEach((sp: any) => {
      if (!processedUsers.has(sp.user_id)) {
        salaryMap.set(sp.user_id, sp.monthly_salary);
        processedUsers.add(sp.user_id);
      }
    });

    return (users || []).map((user) => ({
      ...user,
      current_salary: salaryMap.get(user.id) || null,
    }));
  }

  /**
   * Get salary periods for a user
   */
  async getUserSalaryPeriods(userId: string): Promise<UserSalaryPeriod[]> {
    const { data, error } = await supabase
      .from('user_salary_periods')
      .select('*')
      .eq('user_id', userId)
      .order('period_month', { ascending: false });

    if (error) throw error;
    return (data || []) as UserSalaryPeriod[];
  }

  /**
   * Create or update salary period
   */
  async upsertSalaryPeriod(data: CreateSalaryPeriodData): Promise<void> {
    const { error } = await supabase.rpc('upsert_user_salary_period', {
      p_user_id: data.user_id,
      p_period_month: data.period_month,
      p_monthly_salary: data.monthly_salary,
      p_note: data.note || null,
    });

    if (error) throw error;
  }

  /**
   * Get leaves for a user in a specific month
   */
  async getUserLeaves(userId: string, month: Date): Promise<UserLeave[]> {
    const monthStart = startOfMonth(month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('user_leaves')
      .select('*')
      .eq('user_id', userId)
      .gte('leave_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('leave_date', format(monthEnd, 'yyyy-MM-dd'))
      .order('leave_date', { ascending: true });

    if (error) throw error;
    return (data || []) as UserLeave[];
  }

  /**
   * Create leave
   */
  async createLeave(data: CreateLeaveData): Promise<UserLeave> {
    const { data: leave, error } = await supabase
      .from('user_leaves')
      .insert({
        user_id: data.user_id,
        leave_date: data.leave_date,
        is_paid: data.is_paid,
        leave_type: data.leave_type,
      })
      .select()
      .single();

    if (error) throw error;
    return leave as UserLeave;
  }

  /**
   * Delete leave
   */
  async deleteLeave(leaveId: string): Promise<void> {
    const { error } = await supabase
      .from('user_leaves')
      .delete()
      .eq('id', leaveId);

    if (error) throw error;
  }

  /**
   * Get month stats for multiple users using user_month_salary_calc view
   */
  async getUsersMonthStats(userIds: string[], month: Date): Promise<Map<string, UserMonthStats>> {
    const monthStart = startOfMonth(month);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');

    const statsMap = new Map<string, UserMonthStats>();

    if (userIds.length === 0) return statsMap;

    // Fetch stats from user_month_salary_calc view
    const { data: calcData, error } = await supabase
      .from('user_month_salary_calc')
      .select('*')
      .in('user_id', userIds)
      .eq('month_start', monthStartStr);

    if (error) {
      console.error('Error fetching user month salary calc:', error);
      return statsMap;
    }

    // Convert view data to UserMonthStats format
    (calcData || []).forEach((row: any) => {
      statsMap.set(row.user_id, {
        user_id: row.user_id,
        month_start: row.month_start,
        total_hours: parseFloat(row.total_hours || 0),
        unpaid_leaves: parseFloat(row.unpaid_leave_units || 0),
        monthly_salary: parseFloat(row.effective_monthly_salary || 0),
        net_salary: parseFloat(row.net_monthly_salary || 0),
        days_in_month: row.days_in_month || 0,
        hourly_price: row.hourly_price ? parseFloat(row.hourly_price) : null,
        daily_salary: row.daily_salary ? parseFloat(row.daily_salary) : null,
        deduction_amount: row.deduction_amount ? parseFloat(row.deduction_amount) : null,
      });
    });

    return statsMap;
  }

  /**
   * Get user month stats using user_month_salary_calc view
   */
  async getUserMonthStats(userId: string, month: Date): Promise<UserMonthStats | null> {
    const monthStart = startOfMonth(month);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');

    // Fetch from user_month_salary_calc view
    const { data, error } = await supabase
      .from('user_month_salary_calc')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', monthStartStr)
      .single();

    if (error) {
      // If no data found, return null (user might not have salary or hours for this month)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user month salary calc:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      user_id: data.user_id,
      month_start: data.month_start,
      total_hours: parseFloat(data.total_hours || 0),
      unpaid_leaves: parseFloat(data.unpaid_leave_units || 0),
      monthly_salary: parseFloat(data.effective_monthly_salary || 0),
      net_salary: parseFloat(data.net_monthly_salary || 0),
      days_in_month: data.days_in_month || 0,
      hourly_price: data.hourly_price ? parseFloat(data.hourly_price) : null,
      daily_salary: data.daily_salary ? parseFloat(data.daily_salary) : null,
      deduction_amount: data.deduction_amount ? parseFloat(data.deduction_amount) : null,
    };
  }

  /**
   * Update user details
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Get user worklogs for a month (for calendar view)
   */
  async getUserWorklogsForMonth(userId: string, month: Date) {
    const monthStart = startOfMonth(month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('work_logs')
      .select(`
        id,
        hours,
        hours_num,
        note,
        created_at,
        task_id,
        project_id,
        tasks(name, status),
        projects(name)
      `)
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user project month hours using user_project_month_hours view
   */
  async getUserProjectMonthHours(userId: string, month: Date) {
    const monthStart = startOfMonth(month);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('user_project_month_hours')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', monthStartStr)
      .order('total_hours', { ascending: false });

    if (error) throw error;
    return (data || []) as Array<{
      user_id: string;
      project_id: string | null;
      month_start: string;
      total_hours: number;
    }>;
  }

  /**
   * Get user month hours using user_month_hours view
   */
  async getUserMonthHours(userId: string, month: Date) {
    const monthStart = startOfMonth(month);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('user_month_hours')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', monthStartStr)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No data found
      }
      throw error;
    }

    return data as {
      user_id: string;
      month_start: string;
      total_hours: number;
    } | null;
  }
}

export const userManagementService = new UserManagementService();

