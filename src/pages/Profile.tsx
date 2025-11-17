import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUpdateProfile, useChangePassword } from '@/features/users/hooks/useUpdateProfile';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [rank, setRank] = useState('');

  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.name || '');
      setEmail(profile.email || '');
      setDepartment(profile.department || '');
      setRank(profile.rank || '');
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
    } else if (tab === 'reports') {
      navigate('/user/dashboard');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    }
  };

  if (!profile) {
    return (
      <div className="flex h-screen">
        <UserSidebar currentTab="settings" onTabChange={handleSidebarNavigation} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Calculate member since date
  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), 'MMM yyyy')
    : 'Jan 2023';

  
  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <UserSidebar currentTab="settings" onTabChange={handleSidebarNavigation} />
      
      <div className="flex-1 overflow-y-auto">
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
                      value={profile.role || 'User'}
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
                    <span className="text-sm text-gray-700">{profile.role || 'User'}</span>
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
    </div>
  );
};

export default Profile;

