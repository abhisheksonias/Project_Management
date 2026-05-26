import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ReportStats } from '../services/reportService';

interface ReportStatsCardsProps {
  stats: ReportStats;
}

export const ReportStatsCards: React.FC<ReportStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
      <Card className="rounded-[14px]">
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.totalHours.toFixed(1)}h</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Billable</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.billableHours.toFixed(1)}h</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{stats.billablePercentage.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Non-Billable</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.nonBillableHours.toFixed(1)}h</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Tasks Completed</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.tasksCompleted}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px] col-span-2 sm:col-span-1">
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Projects Contributed</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.projectsContributed}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

