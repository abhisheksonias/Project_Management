import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Project } from '@/features/projects/services/projectService';
import { FolderOpen, Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectInfoCardProps {
  project: Project | undefined;
  isLoading: boolean;
}

export const ProjectInfoCard: React.FC<ProjectInfoCardProps> = ({ project, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] shadow-md bg-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <Card className="rounded-[14px] shadow-md bg-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {project.deadline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Deadline: {format(new Date(project.deadline), 'dd MMM yyyy')}</span>
                </div>
              )}
              {project.status && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Status: {project.status}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

