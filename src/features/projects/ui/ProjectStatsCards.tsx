import React from 'react';
import { Card } from '@/components/ui/card';
import { ProjectStats } from '@/features/projects/services/projectService';

interface ProjectStatsCardsProps {
  stats: ProjectStats;
}

export const ProjectStatsCards: React.FC<ProjectStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">Open</p>
        <p className="text-2xl font-bold">{stats.open}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">In Progress</p>
        <p className="text-2xl font-bold">{stats.inProgress}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">Completed</p>
        <p className="text-2xl font-bold">{stats.completed}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">On Hold</p>
        <p className="text-2xl font-bold">{stats.onHold}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">Client Approval</p>
        <p className="text-2xl font-bold">{stats.clientApproval}</p>
      </Card>
    </div>
  );
};

