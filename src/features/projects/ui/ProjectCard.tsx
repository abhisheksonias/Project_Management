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
import { Building2 } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  showVendor?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  onStatusChange,
  onPriorityChange,
  showVendor = false,
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

  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
          <h3 className="text-base sm:text-lg font-semibold flex-1 min-w-0 truncate">{project.name}</h3>
          {onStatusChange ? (
            <Select
              value={project.status || 'none'}
              onValueChange={(value) => onStatusChange(value === 'none' ? '' : value)}
            >
              <SelectTrigger
                className="h-7 sm:h-8 w-[100px] sm:w-[140px] rounded-[14px] border-secondary bg-secondary text-[10px] sm:text-xs shrink-0"
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
            <Badge className={cn('text-[10px] sm:text-xs shrink-0', getStatusColor(project.status))}>
              {project.status || 'N/A'}
            </Badge>
          )}
        </div>
        {showVendor && project.vendor?.name && (
          <div className="mb-2 sm:mb-3 text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            <span className="truncate">{project.vendor.name}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
          {onPriorityChange ? (
            <Select
              value={project.priority ?? 'none'}
              onValueChange={(value) => onPriorityChange(value === 'none' ? '' : value)}
            >
              <SelectTrigger
                className="h-7 sm:h-8 w-[100px] sm:w-[140px] rounded-[14px] border-secondary bg-secondary text-[10px] sm:text-xs"
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
              <Badge className="text-[10px] sm:text-xs bg-secondary text-foreground">
                {project.priority} Priority
              </Badge>
            )
          )}
        </div>

        <div className="mb-2 sm:mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm text-muted-foreground">Progress</span>
            <span className="text-xs sm:text-sm font-medium">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-1.5 sm:h-2" />
        </div>

        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
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

