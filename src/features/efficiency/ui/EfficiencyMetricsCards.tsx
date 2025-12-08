import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyStats } from '../services/efficiencyService';
import { formatHoursToHHMM } from '@/shared/utils/formatHours';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EfficiencyMetricsCardsProps {
  stats: EfficiencyStats | undefined;
  isLoading: boolean;
}

export const EfficiencyMetricsCards: React.FC<EfficiencyMetricsCardsProps> = ({
  stats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-[14px] shadow-md bg-white">
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
      title: 'Projects Contributed',
      value: stats?.projectsContributed ?? 0,
      change: stats?.projectsContributedChange,
      positive: (stats?.projectsContributedChange || 0) >= 0,
    },
    {
      title: 'Efficiency %',
      value: stats?.efficiencyPercent ? `${Math.round(stats.efficiencyPercent)}%` : '0%',
      change: stats?.efficiencyPercentChange,
      positive: (stats?.efficiencyPercentChange || 0) >= 0,
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
                {metric.change !== undefined && (
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

