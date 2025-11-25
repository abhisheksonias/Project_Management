import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string | null;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  department?: string;
  rank?: string;
}

export const userService = {
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, department')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as User[];
  },

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, department')
      .in('id', userIds);

    if (error) throw error;
    return (data || []) as User[];
  },

  async updateProfile(userId: string, data: UpdateProfileData): Promise<void> {
    const updateData: Record<string, any> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.rank !== undefined) updateData.rank = data.rank;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  },

  async changePassword(email: string): Promise<void> {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) throw error;
  },
};
