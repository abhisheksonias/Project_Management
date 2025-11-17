import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ReportStats } from '../services/reportService';

interface ReportStatsCardsProps {
  stats: ReportStats;
}

export const ReportStatsCards: React.FC<ReportStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      <Card>
        <CardContent className="p-4">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600">Billable</p>
            <p className="text-2xl font-bold text-gray-900">{stats.billableHours}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600">Non-Billable</p>
            <p className="text-2xl font-bold text-gray-900">{stats.nonBillableHours}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600">Tasks Completed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.tasksCompleted}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600">Projects Contributed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.projectsContributed}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

