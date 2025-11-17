import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Project } from '@/features/projects/services/projectService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  showCategory?: boolean;
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  showCategory,
  onStatusChange,
  onPriorityChange,
}) => {
  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'on track':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'at risk':
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
      case 'on hold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'webflow':
        return 'bg-blue-100 text-blue-800';
      case 'shopify':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case 'one-time':
        return 'bg-primary/10 text-primary';
      case 'maintenance':
        return 'bg-emerald-100 text-emerald-700';
      case 'hourly':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-secondary text-foreground';
    }
  };

  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold">{project.name}</h3>
          {onStatusChange ? (
            <Select
              value={project.status || 'none'}
              onValueChange={(value) => onStatusChange(value === 'none' ? '' : value)}
            >
              <SelectTrigger
                className="h-8 w-[140px] rounded-[14px] border-secondary bg-secondary text-xs"
                onClick={(event) => event.stopPropagation()}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent onClick={(event) => event.stopPropagation()}>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Client Approval">Client Approval</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={cn('text-xs', getStatusColor(project.status))}>
              {project.status || 'N/A'}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {project.type && (
            <Badge className={cn('text-xs', getTypeColor(project.type))}>
              {project.type}
            </Badge>
          )}
          {onPriorityChange ? (
            <Select
              value={project.priority ?? 'none'}
              onValueChange={(value) => onPriorityChange(value === 'none' ? '' : value)}
            >
              <SelectTrigger
                className="h-8 w-[140px] rounded-[14px] border-secondary bg-secondary text-xs"
                onClick={(event) => event.stopPropagation()}
              >
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent onClick={(event) => event.stopPropagation()}>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            project.priority && (
              <Badge className="text-xs bg-secondary text-foreground">
                {project.priority} Priority
              </Badge>
            )
          )}
          {showCategory && project.category && (
            <Badge className={cn('text-xs', getCategoryColor(project.category))}>
              {project.category}
            </Badge>
          )}
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-2" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Open Tasks:</span>
            <span className="font-medium">{project.openTasks || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Overdue:</span>
            <span className={cn('font-medium', project.overdueTasks ? 'text-red-600' : '')}>
              {project.overdueTasks || 0}
            </span>
          </div>
          {project.deadline && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due:</span>
              <span className={cn('font-medium', isOverdue ? 'text-red-600' : '')}>
                {format(new Date(project.deadline), 'dd MMM yyyy')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

