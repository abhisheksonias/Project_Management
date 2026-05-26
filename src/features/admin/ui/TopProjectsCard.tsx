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
  filters?: AdminFilters; // Kept for backward compatibility but not used
}

export const TopProjectsCard: React.FC<TopProjectsCardProps> = () => {
  // Top projects are constant - not filtered by date range
  const { data: projects, isLoading, error } = useAdminTopProjects(5, undefined);

  return (
    <Card className="rounded-[14px] border-2 shadow-lg bg-card">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base md:text-lg text-foreground font-semibold">Top Projects</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">By hours logged</p>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                  <Skeleton className="h-2.5 sm:h-3 w-20 sm:w-24" />
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <Skeleton className="h-3 sm:h-4 w-10 sm:w-12" />
                  <Skeleton className="h-4 sm:h-5 w-14 sm:w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-24 sm:h-32 text-xs sm:text-sm text-muted-foreground">
            <p>Error loading projects</p>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex items-center justify-center h-24 sm:h-32 text-xs sm:text-sm text-muted-foreground">
            <p>No projects found</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="flex items-center justify-between py-2 px-2 rounded-[8px] hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{project.name}</p>
                  {project.client && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Client: {project.client}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">{formatHoursToHHMM(project.hours)}h</p>
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

