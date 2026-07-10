import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '../services/taskService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskTimerControls } from '@/features/task-tracker/ui/TaskTimerControls';
import {
  getTaskDeadlineUrgency,
  getDeadlineUrgencyClasses,
  getDeadlineUrgencyLabel,
  sortTasksByDeadline,
} from '@/shared/utils/taskDeadlineUtils';

interface TasksKanbanViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  activeTaskId?: string;
  elapsedLabel?: string;
  onStartTimer?: (task: Task) => void;
  onStopTimer?: () => void;
}

const STATUS_COLUMNS = [
  { id: 'To Do', label: 'To Do', color: 'bg-blue-100 text-blue-800' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { id: 'Blocked', label: 'Blocked', color: 'bg-red-100 text-red-800' },
  { id: 'Review', label: 'Review', color: 'bg-purple-100 text-purple-800' },
];

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

export const TasksKanbanView: React.FC<TasksKanbanViewProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
  activeTaskId,
  elapsedLabel,
  onStartTimer,
  onStopTimer,
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    STATUS_COLUMNS.forEach((col) => {
      grouped[col.id] = [];
    });

    const normalizeStatus = (raw: string | null | undefined): string => {
      if (!raw) return 'To Do';
      const exact = STATUS_COLUMNS.find((col) => col.id === raw);
      if (exact) return exact.id;
      const lower = raw.toLowerCase().trim();
      if (lower === 'todo' || lower === 'to-do' || lower === 'open') return 'To Do';
      if (lower === 'in progress' || lower === 'in-progress' || lower === 'inprogress')
        return 'In Progress';
      if (lower === 'completed' || lower === 'done' || lower === 'complete') return 'Completed';
      if (lower === 'blocked') return 'Blocked';
      if (lower === 'review' || lower === 'in review') return 'Review';
      return 'To Do';
    };

    tasks.forEach((task) => {
      const status = normalizeStatus(task.status);
      grouped[status].push(task);
    });

    STATUS_COLUMNS.forEach((col) => {
      grouped[col.id] = sortTasksByDeadline(grouped[col.id]);
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);

    if (draggedTask && draggedTask.status !== targetColumnId && onStatusChange) {
      onStatusChange(draggedTask.id, targetColumnId);
    }

    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDraggedOverColumn(null);
  };

  return (
    <div className="h-full w-full overflow-x-auto pb-4">
      <div className="flex h-full min-h-0 min-w-max items-stretch gap-2 sm:gap-3 md:gap-4 px-1 sm:px-2">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.id] || [];
          const isDraggedOver = draggedOverColumn === column.id;

          return (
            <div
              key={column.id}
              className="flex h-full min-h-0 w-[220px] shrink-0 flex-col sm:w-[260px] md:w-[280px] xl:w-[300px]"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <Card
                className={cn(
                  'flex h-full min-h-0 flex-col transition-colors',
                  isDraggedOver && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-2 sm:p-3">
                  <div className="mb-2 sm:mb-3 flex shrink-0 items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Badge className={cn('text-[10px] sm:text-xs', column.color)}>
                        {column.label}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        ({columnTasks.length})
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 sm:space-y-2">
                    {columnTasks.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-secondary py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                        Drop tasks here
                      </div>
                    ) : (
                      columnTasks.map((task) => {
                        const deadlineUrgency = getTaskDeadlineUrgency(task);
                        const urgencyClasses = getDeadlineUrgencyClasses(deadlineUrgency);
                        const urgencyLabel = getDeadlineUrgencyLabel(deadlineUrgency);

                        return (
                        <Card
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'cursor-move border transition-all hover:shadow-md',
                            draggedTask?.id === task.id && 'opacity-50',
                            urgencyClasses.card
                          )}
                          onClick={() => {
                            if (!draggedTask) {
                              onTaskClick?.(task);
                            }
                          }}
                        >
                          <CardContent className="p-2 sm:p-2.5">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="line-clamp-2 flex-1 text-xs font-medium sm:text-sm">
                                {task.name}
                              </h4>
                              <div className="flex shrink-0 items-center gap-0.5">
                                {onStartTimer && onStopTimer && (
                                  <TaskTimerControls
                                    isActive={activeTaskId === task.id}
                                    elapsedLabel={
                                      activeTaskId === task.id ? elapsedLabel : undefined
                                    }
                                    onStart={() => onStartTimer(task)}
                                    onStop={onStopTimer}
                                    compact
                                  />
                                )}
                                {task.milestones && (
                                  <span className="shrink-0 rounded-md bg-primary px-1 py-0 text-[10px] text-white sm:px-1.5 sm:text-xs">
                                    #{' '}
                                    {task.milestones.sort_order !== null
                                      ? task.milestones.sort_order
                                      : task.milestones.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            {task.projects?.name && (
                              <p className="mb-1 line-clamp-1 text-[10px] text-muted-foreground sm:mb-1.5 sm:text-xs">
                                {task.projects.name}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                              {urgencyLabel && (
                                <Badge
                                  className={cn(
                                    'px-1 py-0 text-[10px] sm:px-1.5 sm:text-xs',
                                    urgencyClasses.badge
                                  )}
                                >
                                  {urgencyLabel}
                                </Badge>
                              )}
                              {task.priority && (
                                <Badge
                                  className={cn(
                                    'px-1 py-0 text-[10px] sm:px-1.5 sm:text-xs',
                                    getPriorityColor(task.priority)
                                  )}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              {task.deadline && (
                                <span
                                  className={cn(
                                    'text-[10px] sm:text-xs',
                                    urgencyClasses.text
                                  )}
                                >
                                  {format(new Date(task.deadline), 'dd MMM')}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};
