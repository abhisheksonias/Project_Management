import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUpdateProfile, useChangePassword } from '@/features/users/hooks/useUpdateProfile';
import { userService } from '@/features/users/services/userService';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LogOut, Camera, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AdminProfile: React.FC = () => {
  const { profile, signOut } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [rank, setRank] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.name || '');
      setEmail(profile.email || '');
      setDepartment(profile.department || '');
      setRank(profile.rank || '');
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      const changed =
        fullName !== profile.name ||
        email !== profile.email ||
        department !== (profile.department || '') ||
        rank !== (profile.rank || '');
      setHasChanges(changed);
    }
  }, [fullName, email, department, rank, profile]);

  const handleSave = async () => {
    if (!profile) return;

    try {
      await updateProfileMutation.mutateAsync({
        name: fullName,
        email: email !== profile.email ? email : undefined,
        department: department || undefined,
        rank: rank || undefined,
      });
      setHasChanges(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.name || '');
      setEmail(profile.email || '');
      setDepartment(profile.department || '');
      setRank(profile.rank || '');
      setHasChanges(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      await changePasswordMutation.mutateAsync();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsLogoutDialogOpen(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        try {
          await userService.deleteAvatar(profile.id, profile.avatar_url);
        } catch (error) {
          // Ignore errors when deleting old avatar
          console.warn('Failed to delete old avatar:', error);
        }
      }

      // Upload new avatar
      const avatarUrl = await userService.uploadAvatar(profile.id, file);
      
      // Update profile with new avatar URL
      await updateProfileMutation.mutateAsync({
        avatar_url: avatarUrl,
      });

      setAvatarPreview(avatarUrl);
      toast.success('Profile picture updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile || !profile.avatar_url) return;

    setIsUploadingAvatar(true);

    try {
      // Delete avatar from storage
      await userService.deleteAvatar(profile.id, profile.avatar_url);
      
      // Update profile to remove avatar URL
      await updateProfileMutation.mutateAsync({
        avatar_url: null,
      });

      setAvatarPreview(null);
      toast.success('Profile picture removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (!profile) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </AdminLayout>
    );
  }

  // Calculate member since date
  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), 'MMM yyyy')
    : 'Jan 2023';

  
  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile & Settings</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">Member since {memberSince}</p>
                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5">
                  {profile.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={!hasChanges || updateProfileMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateProfileMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information - Takes 2 columns */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center gap-6 pb-6 border-b">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={avatarPreview || undefined} alt={profile.name} />
                      <AvatarFallback className="bg-primary text-white text-2xl">
                        {profile.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-sm font-semibold">Profile Picture</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG or GIF. Max size 5MB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                        className="rounded-[14px]"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {avatarPreview ? 'Change' : 'Upload'}
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="rounded-[14px] text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rank">Rank</Label>
                    <Input
                      id="rank"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profile.role || 'Admin'}
                      disabled
                      className="bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security and Account Info - Right Column */}
            <div className="space-y-6">
              {/* Security Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-normal">Status</Label>
                    <span className="text-sm text-gray-700">
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-normal">User ID</Label>
                    <span className="text-sm text-gray-700 font-mono">
                      {profile.id.slice(0, 4)}-{profile.id.slice(4, 8)}-{profile.id.slice(8, 12)}-{profile.id.slice(12, 16)}
                    </span>
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                  >
                    {changePasswordMutation.isPending ? 'Sending...' : 'Change Password'}
                  </Button>
                  <Button
                    onClick={() => setIsLogoutDialogOpen(true)}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 mt-2"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </CardContent>
              </Card>

              {/* Account Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Account Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-normal">Role</Label>
                    <span className="text-sm text-gray-700">{profile.role || 'Admin'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-normal">Department</Label>
                    <span className="text-sm text-gray-700">
                      {profile.department || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[14px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 rounded-[14px]"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminProfile;

