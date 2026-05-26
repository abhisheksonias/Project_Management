import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HoursByTaskData } from '../services/projectEfficiencyService';
import { formatHoursToHHMM } from '@/shared/utils/formatHours';

interface HoursByTaskTableProps {
  data: HoursByTaskData[] | undefined;
  isLoading: boolean;
}

export const HoursByTaskTable: React.FC<HoursByTaskTableProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Hours by Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-[14px]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="rounded-[14px] shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Hours by Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No hours logged for this project yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px] shadow-md bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Hours by Task</CardTitle>
        <p className="text-xs text-muted-foreground">
          Total tasks: {data?.length}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((task) => (
            <div
              key={task.taskId}
              className="rounded-[14px] border border-border px-4 py-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm bg-primary width-fit rounded-md px-2 py-1 text-white font-medium">  {task.taskName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-primary">
                    {formatHoursToHHMM(task.hours)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total hours</p>
                </div>
              </div>

              <div className="space-y-2">
                {task.contributions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No individual contributions recorded.</p>
                ) : (
                  task.contributions.map((contribution) => (
                    <div
                      key={`${task.taskId}-${contribution.userId}`}
                      className="flex items-center justify-between rounded-[10px] bg-muted/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{contribution.userName}</p>
                        
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatHoursToHHMM(contribution.hours)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
