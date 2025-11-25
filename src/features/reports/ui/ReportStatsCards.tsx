import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ReportStats } from '../services/reportService';

interface ReportStatsCardsProps {
  stats: ReportStats;
}

export const ReportStatsCards: React.FC<ReportStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <Card className="rounded-[14px]">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalHours.toFixed(1)}h</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Billable</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.billableHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.billablePercentage.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Non-Billable</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.nonBillableHours.toFixed(1)}h</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Tasks Completed</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.tasksCompleted}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Projects Contributed</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.projectsContributed}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

