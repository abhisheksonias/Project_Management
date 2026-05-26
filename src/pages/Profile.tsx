import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { UserPageLayout } from '@/shared/ui/UserPageLayout';
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

const Profile: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
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

  const handleSidebarNavigation = (tab: string) => {
    if (tab === 'dashboard') {
      navigate('/user/dashboard');
    } else if (tab === 'calendar') {
      navigate('/user/calendar');
    } else if (tab === 'worklog-history') {
      navigate('/user/worklog-history');
    } else if (tab === 'projects') {
      navigate('/user/projects');
    } else if (tab === 'tasks') {
      navigate('/user/tasks');
    } else if (tab === 'task-tracker') {
      navigate('/user/task-tracker');
    } else if (tab === 'reports') {
      navigate('/user/reports');
    } else if (tab === 'shared-tables') {
      navigate('/user/shared-tables');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    } else if (tab === 'change-requests') {
      navigate('/user/change-requests');
    }
  };

  if (!profile) {
    return (
      <UserPageLayout
        sidebar={<UserSidebar currentTab="settings" onTabChange={handleSidebarNavigation} />}
      >
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <p className="text-sm sm:text-base text-muted-foreground">Loading profile...</p>
        </div>
      </UserPageLayout>
    );
  }

  // Calculate member since date
  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), 'MMM yyyy')
    : 'Jan 2023';

  
  return (
    <UserPageLayout
      className="bg-[#FAFAFA]"
      sidebar={<UserSidebar currentTab="settings" onTabChange={handleSidebarNavigation} />}
    >
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-6 md:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Profile & Settings</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <p className="text-xs sm:text-sm text-gray-500">Member since {memberSince}</p>
                <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs px-2 py-0.5">
                  {profile.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={!hasChanges || updateProfileMutation.isPending}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateProfileMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {/* Basic Information - Takes 2 columns */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
                {/* Profile Picture Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pb-4 sm:pb-6 border-b">
                  <div className="relative">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                      <AvatarImage src={avatarPreview || undefined} alt={profile.name} />
                      <AvatarFallback className="bg-primary text-white text-xl sm:text-2xl">
                        {profile.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <div>
                      <Label className="text-xs sm:text-sm font-semibold">Profile Picture</Label>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        JPG, PNG or GIF. Max size 5MB
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                        className="rounded-[14px] text-xs sm:text-sm w-full sm:w-auto"
                      >
                        <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        {avatarPreview ? 'Change' : 'Upload'}
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="rounded-[14px] text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm w-full sm:w-auto"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="fullName" className="text-xs sm:text-sm">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-gray-50 text-sm h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-50 text-sm h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="department" className="text-xs sm:text-sm">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="bg-gray-50 text-sm h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="rank" className="text-xs sm:text-sm">Rank</Label>
                    <Input
                      id="rank"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      className="bg-gray-50 text-sm h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="role" className="text-xs sm:text-sm">Role</Label>
                    <Input
                      id="role"
                      value={profile.role || 'User'}
                      disabled
                      className="bg-gray-100 text-gray-600 text-sm h-9 sm:h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security and Account Info - Right Column */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Security Card */}
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs sm:text-sm font-normal">Status</Label>
                    <span className="text-xs sm:text-sm text-gray-700">
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-xs sm:text-sm font-normal">User ID</Label>
                    <span className="text-[10px] sm:text-xs text-gray-700 font-mono break-all text-right ml-2">
                      {profile.id.slice(0, 4)}-{profile.id.slice(4, 8)}-{profile.id.slice(8, 12)}-{profile.id.slice(12, 16)}
                    </span>
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-3 sm:mt-4 text-sm h-9 sm:h-10"
                  >
                    {changePasswordMutation.isPending ? 'Sending...' : 'Change Password'}
                  </Button>
                  <Button
                    onClick={() => setIsLogoutDialogOpen(true)}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 mt-2 text-sm h-9 sm:h-10"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Logout
                  </Button>
                </CardContent>
              </Card>

              {/* Account Info Card */}
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Account Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs sm:text-sm font-normal">Role</Label>
                    <span className="text-xs sm:text-sm text-gray-700">{profile.role || 'User'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-xs sm:text-sm font-normal">Department</Label>
                    <span className="text-xs sm:text-sm text-gray-700">
                      {profile.department || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="rounded-[14px] max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Are you sure you want to logout? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-[14px] w-full sm:w-auto text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 rounded-[14px] w-full sm:w-auto text-sm"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UserPageLayout>
  );
};

export default Profile;

