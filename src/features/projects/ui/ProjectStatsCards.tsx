import React from 'react';
import { Card } from '@/components/ui/card';
import { ProjectStats } from '@/features/projects/services/projectService';

interface ProjectStatsCardsProps {
  stats: ProjectStats;
}

export const ProjectStatsCards: React.FC<ProjectStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Open</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.open}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">In Progress</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.inProgress}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Completed</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.completed}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">On Hold</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.onHold}</p>
      </Card>
      <Card className="p-3 sm:p-4 col-span-2 sm:col-span-1">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Client Approval</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.clientApproval}</p>
      </Card>
    </div>
  );
};

