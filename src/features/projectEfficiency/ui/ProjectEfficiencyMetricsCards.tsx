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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30 hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{metric.title}</p>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                {metric.change !== undefined && metric.change !== 0 && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-[8px]",
                    metric.positive ? "bg-green-100" : "bg-red-100"
                  )}>
                    {metric.positive ? (
                      <TrendingUp className="h-4 w-4 text-green-700" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-700" />
                    )}
                    <span
                      className={cn(
                        'text-xs font-bold',
                        metric.positive ? 'text-green-700' : 'text-red-700'
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

