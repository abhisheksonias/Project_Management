import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users, Briefcase } from 'lucide-react';
import { useAdminStats } from '../hooks/useAdminStats';
import { AdminFilters } from '../services/adminService';

const formatHours = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
};

interface CompanyPerformanceSummaryProps {
  filters?: AdminFilters;
}

export const CompanyPerformanceSummary: React.FC<CompanyPerformanceSummaryProps> = ({ filters }) => {
  const { data: stats, isLoading } = useAdminStats(filters);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Active Projects */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Active Projects
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.activeProjects ?? 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billable Hours */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Billable Hours
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-700 mt-0.5 sm:mt-1 truncate">
                  {formatHours(stats?.billableHours ?? 0)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Non-Billable Hours */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Non-Billable Hours
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate">
                  {formatHours(stats?.nonBillableHours ?? 0)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Active Tasks
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.inProgressTasks ?? 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

