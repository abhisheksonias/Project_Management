import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from '@/features/users/services/userService';
import { User as UserIcon, Mail, Briefcase } from 'lucide-react';

interface UserProfileCardProps {
  user: User | undefined;
  isLoading: boolean;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ user, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] shadow-md bg-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Card className="rounded-[14px] shadow-md bg-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{user.role || 'Team Member'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

