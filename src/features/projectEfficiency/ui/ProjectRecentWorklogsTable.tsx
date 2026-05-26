import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectRecentWorklog } from '../services/projectEfficiencyService';
import { format } from 'date-fns';
import { normalizeHoursToHHMM } from '@/shared/utils/formatHours';

interface ProjectRecentWorklogsTableProps {
  worklogs: ProjectRecentWorklog[] | undefined;
  isLoading: boolean;
}

export const ProjectRecentWorklogsTable: React.FC<ProjectRecentWorklogsTableProps> = ({
  worklogs,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Worklogs (Selected Project)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-[14px]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!worklogs || worklogs.length === 0) {
    return (
      <Card className="rounded-[14px] shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Worklogs (Selected Project)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent worklogs found for this project</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px] shadow-md bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Worklogs (Selected Project)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary rounded-t-[14px]">
              <tr>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-l-[14px]">
                  Date
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  User
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Task
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-r-[14px]">
                  Hours Logged
                </th>
              </tr>
            </thead>
            <tbody>
              {worklogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-secondary/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-3 text-sm">
                    {format(new Date(log.date), 'yyyy-MM-dd')}
                  </td>
                  <td className="p-3 text-sm">{log.userName || '—'}</td>
                  <td className="p-3 text-sm">{log.taskName || '—'}</td>
                  <td className="p-3 text-sm font-semibold text-primary">
                    {normalizeHoursToHHMM(log.hours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

