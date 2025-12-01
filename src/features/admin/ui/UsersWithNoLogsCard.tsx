import React from 'react';
import { Card } from '@/components/ui/card';
import { UserWithNoLog } from '../services/adminWorklogService';
import { Skeleton } from '@/components/ui/skeleton';
import { User, MoreVertical, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UsersWithNoLogsCardProps {
  users: UserWithNoLog[];
  isLoading: boolean;
  onAddWorklog?: (userId: string) => void;
}

export const UsersWithNoLogsCard: React.FC<UsersWithNoLogsCardProps> = ({
  users,
  isLoading,
  onAddWorklog,
}) => {
  const MINIMUM_HOURS_PER_DAY = 8;

  if (isLoading) {
    return (
      <Card className="p-6 rounded-[14px] bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Users Below Target Hours</h3>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-[14px]" />
          ))}
        </div>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="p-6 rounded-[14px] bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Users Below Target Hours</h3>
          <span className="text-sm text-muted-foreground">0 users</span>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>All users have met the {MINIMUM_HOURS_PER_DAY}h requirement</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-[14px] bg-white flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold">Users Below Target Hours</h3>
          <p className="text-xs text-muted-foreground">
            Minimum required: {MINIMUM_HOURS_PER_DAY}h / day
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </span>
      </div>
      <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 rounded-[14px] border border-secondary hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.role || user.department || '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600 flex items-center justify-end gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {user.totalHours.toFixed(2)}h
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.totalHours < MINIMUM_HOURS_PER_DAY
                    ? `Needs ${(MINIMUM_HOURS_PER_DAY - user.totalHours).toFixed(2)}h`
                    : `Target met`}
                </p>
              </div>
              {onAddWorklog && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-secondary rounded-[14px] transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-[14px]">
                    <DropdownMenuItem
                      onClick={() => onAddWorklog(user.id)}
                      className="rounded-[14px]"
                    >
                      Add Worklog
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

