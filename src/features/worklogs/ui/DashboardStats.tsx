import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardStatsProps {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  tasksInProgress: number;
  tasksCompleted: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalHours,
  billableHours,
  nonBillableHours,
  tasksInProgress,
  tasksCompleted,
}) => {
  const formatHours = (hours: number) => {
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card className="bg-secondary">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Hours</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatHours(totalHours)}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Billable Hours</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatHours(billableHours)}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Non-Billable Hours</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold">{formatHours(nonBillableHours)}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tasks In Progress</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold">{tasksInProgress}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary col-span-2 sm:col-span-1">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tasks Completed</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold">{tasksCompleted}</p>
        </CardContent>
      </Card>
    </div>
  );
};

