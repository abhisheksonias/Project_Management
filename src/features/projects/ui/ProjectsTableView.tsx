import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectsTableViewProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onStatusChange?: (projectId: string, status: string) => void;
  onPriorityChange?: (projectId: string, priority: string) => void;
  showVendor?: boolean;
}

export const ProjectsTableView: React.FC<ProjectsTableViewProps> = ({
  projects,
  onProjectClick,
  onStatusChange,
  onPriorityChange,
  showVendor = false,
}) => {
  const isMobile = useIsMobile();

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

  if (projects.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-muted-foreground">No projects found</p>
        </div>
      </Card>
    );
  }

  // Mobile Card Layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {projects.map((project) => {
          const isOverdue = project.deadline && new Date(project.deadline) < new Date();
          return (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onProjectClick(project)}
            >
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm flex-1">{project.name}</h3>
                  {onStatusChange ? (
                    <Select
                      value={project.status || 'none'}
                      onValueChange={(value) =>
                        onStatusChange(project.id, value === 'none' ? '' : value)
                      }
                    >
                      <SelectTrigger
                        className="h-7 w-24 rounded-[14px] border-secondary bg-secondary text-[10px]"
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
                    <Badge className={cn('text-[10px]', getStatusColor(project.status))}>
                      {project.status || 'N/A'}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {project.priority && <span>Priority: {project.priority}</span>}
                  {project.deadline && (
                    <span className={cn(isOverdue && 'text-red-600')}>
                      Due: {format(new Date(project.deadline), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{project.progress || 0}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Open: {project.openTasks || 0}</span>
                  {project.overdueTasks > 0 && (
                    <span className="text-red-600">Overdue: {project.overdueTasks}</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop Table Layout
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Project Name</th>
              {showVendor && <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Vendor</th>}
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Status</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Priority</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Progress</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Tasks</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const isOverdue = project.deadline && new Date(project.deadline) < new Date();
              
              return (
                <tr
                  key={project.id}
                  className="border-b border-secondary hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => onProjectClick(project)}
                >
                  <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium">{project.name}</td>
                  {showVendor && (
                    <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                      {project.vendor?.name ?? '—'}
                    </td>
                  )}
                  <td className="p-3 sm:p-4">
                    {onStatusChange ? (
                      <Select
                        value={project.status || 'none'}
                        onValueChange={(value) =>
                          onStatusChange(project.id, value === 'none' ? '' : value)
                        }
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
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm">
                    {onPriorityChange ? (
                      <Select
                        value={project.priority ?? 'none'}
                        onValueChange={(value) =>
                          onPriorityChange(project.id, value === 'none' ? '' : value)
                        }
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
                      project.priority || '-'
                    )}
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm">{project.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="text-xs sm:text-sm">
                      <div>Open: {project.openTasks || 0}</div>
                      {project.overdueTasks > 0 && (
                        <div className="text-red-600">Overdue: {project.overdueTasks}</div>
                      )}
                    </div>
                  </td>
                  <td className={cn('p-3 sm:p-4 text-xs sm:text-sm', isOverdue && 'text-red-600')}>
                    {project.deadline ? format(new Date(project.deadline), 'dd MMM yyyy') : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

