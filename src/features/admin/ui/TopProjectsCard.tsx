import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAdminTopProjects } from '../hooks/useAdminTopProjects';
import { formatHoursToHHMM } from '@/shared/utils/formatHours';
import { AdminFilters } from '../services/adminService';

type ProjectStatus = 'on-track' | 'at-risk' | 'overdue';

const getStatusBadge = (status: ProjectStatus) => {
  const variants = {
    'on-track': 'bg-green-500 text-white',
    'at-risk': 'bg-orange-500 text-white',
    'overdue': 'bg-primary text-white',
  };

  const labels = {
    'on-track': 'On Track',
    'at-risk': 'At Risk',
    'overdue': 'Overdue',
  };

  return (
    <Badge className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", variants[status])}>
      {labels[status]}
    </Badge>
  );
};

interface TopProjectsCardProps {
  filters?: AdminFilters;
}

export const TopProjectsCard: React.FC<TopProjectsCardProps> = ({ filters }) => {
  const { data: projects, isLoading, error } = useAdminTopProjects(5, filters);

  return (
    <Card className="rounded-[14px] shadow-md">
      <CardHeader>
        <CardTitle className="text-foreground font-semibold">Top Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>Error loading projects</p>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>No projects found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{project.name}</p>
                  {project.client && (
                    <p className="text-sm text-muted-foreground">Client: {project.client}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium text-foreground">{formatHoursToHHMM(project.hours)}h</p>
                  {getStatusBadge(project.status as ProjectStatus)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

