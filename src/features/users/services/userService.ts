import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string | null;
  avatar_url?: string | null;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  department?: string;
  rank?: string;
  avatar_url?: string | null;
}

export const userService = {
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, avatar_url')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as User[];
  },

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, avatar_url')
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
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async deleteAvatar(userId: string, avatarUrl: string): Promise<void> {
    // Extract file path from URL
    // URL format: https://[project-id].supabase.co/storage/v1/object/public/avatars/[file-path]
    const urlParts = avatarUrl.split('/');
    const publicIndex = urlParts.findIndex(part => part === 'public');
    
    if (publicIndex === -1) {
      throw new Error('Invalid avatar URL format');
    }
    
    // Get path after 'public' (e.g., 'avatars/filename.jpg')
    const filePath = urlParts.slice(publicIndex + 1).join('/');

    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath.replace('avatars/', '')]); // Remove 'avatars/' prefix as it's already in the bucket name

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
