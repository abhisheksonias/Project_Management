import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectEfficiencyStats } from '../services/projectEfficiencyService';
import { formatHoursToHHMM } from '@/shared/utils/formatHours';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ProjectEfficiencyMetricsCardsProps {
  stats: ProjectEfficiencyStats | undefined;
  isLoading: boolean;
}

export const ProjectEfficiencyMetricsCards: React.FC<ProjectEfficiencyMetricsCardsProps> = ({
  stats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-[14px] shadow-md bg-card">
            <CardContent className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-baseline justify-between">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const metrics = [
    {
      title: 'Total Hours',
      value: stats?.totalHours ? formatHoursToHHMM(stats.totalHours) : '0:00',
      change: stats?.totalHoursChange,
      positive: (stats?.totalHoursChange || 0) >= 0,
    },
    {
      title: 'Active Days',
      value: stats?.activeDays ?? 0,
      change: stats?.activeDaysChange,
      positive: (stats?.activeDaysChange || 0) >= 0,
    },
    {
      title: 'Tasks Completed',
      value: stats?.tasksCompleted ?? 0,
      change: stats?.tasksCompletedChange,
      positive: (stats?.tasksCompletedChange || 0) >= 0,
    },
    {
      title: 'Team Members',
      value: stats?.teamMembers ?? 0,
      change: stats?.teamMembersChange,
      positive: (stats?.teamMembersChange || 0) >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="rounded-[14px] shadow-md bg-card">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                {metric.change !== undefined && (
                  <div className="flex items-center gap-1">
                    {metric.positive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-primary" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        metric.positive ? 'text-green-600' : 'text-primary'
                      )}
                    >
                      {formatChange(metric.change)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

