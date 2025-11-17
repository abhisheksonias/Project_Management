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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card className="bg-secondary">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Billable Hours</p>
          <p className="text-2xl font-bold">{formatHours(billableHours)}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Non-Billable Hours</p>
          <p className="text-2xl font-bold">{formatHours(nonBillableHours)}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Tasks In Progress</p>
          <p className="text-2xl font-bold">{tasksInProgress}</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Tasks Completed</p>
          <p className="text-2xl font-bold">{tasksCompleted}</p>
        </CardContent>
      </Card>
    </div>
  );
};

