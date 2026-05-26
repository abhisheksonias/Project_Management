import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userService, UpdateProfileData } from '../services/userService';
import { useAuth } from '@/contexts/AuthContext';

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => {
      if (!profile?.id) {
        throw new Error('User not authenticated');
      }
      return userService.updateProfile(profile.id, data);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      // Refresh the page to update auth context with new profile data
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
};

export const useChangePassword = () => {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!profile?.email) {
        throw new Error('User email not found');
      }
      return userService.changePassword(profile.email);
    },
    onSuccess: () => {
      toast.success('Password reset email sent. Please check your inbox.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send password reset email');
    },
  });
};

