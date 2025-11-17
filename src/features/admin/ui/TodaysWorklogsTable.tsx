import React from 'react';
import { Card } from '@/components/ui/card';
import { AdminWorklog } from '../services/adminWorklogService';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';
import { normalizeHoursToHHMM } from '@/shared/utils/formatHours';

interface TodaysWorklogsTableProps {
  worklogs: AdminWorklog[];
  isLoading: boolean;
}

const formatHours = (hours: string) => {
  if (!hours) return '00:00';
  // Normalize to HH:MM format
  return normalizeHoursToHHMM(hours);
};

export const TodaysWorklogsTable: React.FC<TodaysWorklogsTableProps> = ({
  worklogs,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="p-6 rounded-[14px] bg-white">
        <h3 className="text-lg font-semibold mb-4">Today's Worklogs</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-[14px]" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-[14px] bg-white flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Today's Worklogs</h3>
        <span className="text-sm text-muted-foreground">
          Showing {worklogs.length} {worklogs.length === 1 ? 'log' : 'logs'}
        </span>
      </div>
      {worklogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No worklogs found for today</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[400px] flex-1">
          <table className="w-full">
            <thead className="bg-secondary sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-l-[14px]">
                  User
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Project
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Task
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-r-[14px]">
                  Hours
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
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{log.user?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{log.project?.name || '—'}</td>
                  <td className="p-3 text-sm">{log.task?.name || '—'}</td>
                  <td className="p-3 text-sm font-semibold text-primary">
                    {formatHours(log.hours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

