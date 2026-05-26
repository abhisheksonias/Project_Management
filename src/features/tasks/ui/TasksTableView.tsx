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
import { Task } from '../services/taskService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { stripHtml } from '@/shared/utils/htmlUtils';

type TaskCategory = 'design' | 'development';

interface TasksTableViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onCategoryChange?: (taskId: string, category: TaskCategory | null) => void;
  categoryEditable?: boolean;
  categoryUpdatingId?: string | null;
}

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
];

const getStatusColor = (status: string | null) => {
  // Use exact status match (case-sensitive)
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'Blocked':
      return 'bg-red-100 text-red-800';
    case 'Review':
      return 'bg-purple-100 text-purple-800';
    case 'To Do':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string | null) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const TasksTableView: React.FC<TasksTableViewProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
  onCategoryChange,
  categoryEditable = false,
  categoryUpdatingId = null,
}) => {
  const isMobile = useIsMobile();

  if (tasks.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-muted-foreground">No tasks found</p>
        </div>
      </Card>
    );
  }

  // Mobile Card Layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onTaskClick?.(task)}
          >
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm flex-1">{task.name}</h3>
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.status || 'To Do'}
                    onValueChange={(value) => {
                      if (onStatusChange && value !== task.status) {
                        onStatusChange(task.id, value);
                      }
                    }}
                  >
                    <SelectTrigger className={cn('h-7 w-24 text-[10px] border-none shadow-none', getStatusColor(task.status || 'To Do'))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {task.projects?.name && <span>Project: {task.projects.name}</span>}
                {task.priority && (
                  <Badge variant="outline" className={cn('text-[10px]', getPriorityColor(task.priority))}>
                    {task.priority}
                  </Badge>
                )}
                {task.category && <span className="capitalize">Category: {task.category}</span>}
                {task.estimate_hours && <span>Est: {task.estimate_hours}h</span>}
                {task.deadline && (
                  <span>Due: {format(new Date(task.deadline), 'dd MMM yyyy')}</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop Table Layout
  const COLUMN_COUNT = 7;
  const columnWidth = `${100 / COLUMN_COUNT}%`;

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            {Array.from({ length: COLUMN_COUNT }).map((_, index) => (
              <col key={index} style={{ width: columnWidth }} />
            ))}
          </colgroup>
          <thead className="bg-secondary">
            <tr>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold">Task Name</th>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold">Project</th>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold">Status</th>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold">Priority</th>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold">Category</th>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold">Estimate</th>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="border-b hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => onTaskClick?.(task)}
              >
                <td className="p-3 sm:p-4">
                  <div>
                    <div className="font-medium text-xs sm:text-sm">{task.name}</div>
                    {task.description && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
                        {stripHtml(task.description)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 sm:p-4">
                  <span className="text-xs sm:text-sm">{task.projects?.name || '-'}</span>
                </td>
                <td className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.status || 'To Do'}
                    onValueChange={(value) => {
                      if (onStatusChange && value !== task.status) {
                        onStatusChange(task.id, value);
                      }
                    }}
                  >
                    <SelectTrigger className={cn('w-28 sm:w-32 text-xs border-none shadow-none h-6', getStatusColor(task.status || 'To Do'))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 sm:p-4">
                  {task.priority ? (
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getPriorityColor(task.priority))}
                    >
                      {task.priority}
                    </Badge>
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                  {categoryEditable ? (
                    <Select
                      value={task.category ?? 'unassigned'}
                      onValueChange={(value) => {
                        if (!onCategoryChange) return;
                        if (value === 'unassigned') {
                          onCategoryChange(task.id, null);
                          return;
                        }
                        const typedValue = value as TaskCategory;
                        if (typedValue !== task.category) {
                          onCategoryChange(task.id, typedValue);
                        }
                      }}
                      disabled={categoryUpdatingId === task.id}
                    >
                      <SelectTrigger className="h-8 w-full rounded-[12px] border border-secondary bg-white px-3 text-left text-xs sm:text-sm capitalize">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs sm:text-sm capitalize">{task.category || '-'}</span>
                  )}
                </td>
                <td className="p-3 sm:p-4">
                  <span className="text-xs sm:text-sm">
                    {task.estimate_hours ? `${task.estimate_hours}h` : '-'}
                  </span>
                </td>
                <td className="p-3 sm:p-4">
                  {task.deadline ? (
                    <span className="text-xs sm:text-sm">
                      {format(new Date(task.deadline), 'dd MMM yyyy')}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

