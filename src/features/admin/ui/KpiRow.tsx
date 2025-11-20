import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAdminStats } from '../hooks/useAdminStats';
import { formatHoursToHHMM } from '@/shared/utils/formatHours';
import { AdminFilters } from '../services/adminService';

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
  isLoading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, trendPositive = true, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] shadow-md">
        <CardContent className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-9 w-16" />
              {trend && <Skeleton className="h-4 w-12" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px] shadow-md">
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <span className={cn(
                "text-sm font-medium",
                trendPositive ? "text-green-600" : "text-primary"
              )}>
                {trend}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface KpiRowProps {
  filters?: AdminFilters;
}

export const KpiRow: React.FC<KpiRowProps> = ({ filters }) => {
  const { data: stats, isLoading, error } = useAdminStats(filters);

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-[14px] shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Error loading data</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard 
        title="In-Progress" 
        value={stats?.activeProjects ?? 0}
        isLoading={isLoading}
      />
      <KpiCard 
        title="Completed Projects" 
        value={stats?.completedProjects ?? 0}
        isLoading={isLoading}
      />
      <KpiCard 
        title="Open Tasks" 
        value={stats?.openTasks ?? 0}
        isLoading={isLoading}
      />
      <KpiCard 
        title="Hours Logged" 
        value={stats?.hoursLoggedThisWeek ? `${formatHoursToHHMM(stats.hoursLoggedThisWeek)}h` : '0:00h'}
        isLoading={isLoading}
      />
    </div>
  );
};

