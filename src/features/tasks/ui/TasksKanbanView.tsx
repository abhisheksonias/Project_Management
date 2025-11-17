import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '../services/taskService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TasksKanbanViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

// Strict status values as per requirements
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
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    STATUS_COLUMNS.forEach((col) => {
      grouped[col.id] = [];
    });
    
    tasks.forEach((task) => {
      // Use exact status match - only these 5 statuses are valid
      const status = task.status && STATUS_COLUMNS.find(col => col.id === task.status) 
        ? task.status 
        : 'To Do';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['To Do'].push(task);
      }
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
      <div className="flex h-full min-w-full gap-4 px-2">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.id] || [];
          const isDraggedOver = draggedOverColumn === column.id;
          
          return (
            <div
              key={column.id}
              className="flex h-full min-h-0 min-w-[280px] max-w-[320px] flex-1 flex-col py-2 xl:min-w-[300px] xl:max-w-[340px]"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <Card className={cn(
                'flex h-full flex-col transition-colors',
                isDraggedOver && 'ring-2 ring-primary ring-offset-2'
              )}>
                <CardContent className="flex h-full flex-col p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', column.color)}>
                        {column.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({columnTasks.length})
                      </span>
                    </div>
                  </div>
                  
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {columnTasks.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-secondary py-8 text-center text-sm text-muted-foreground">
                        Drop tasks here
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <Card
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'cursor-move border transition-all hover:shadow-md',
                            draggedTask?.id === task.id && 'opacity-50'
                          )}
                          onClick={(e) => {
                            // Only trigger click if not dragging
                            if (!draggedTask) {
                              onTaskClick?.(task);
                            }
                          }}
                        >
                          <CardContent className="p-2.5">
                            <h4 className="mb-1.5 line-clamp-2 text-sm font-medium">{task.name}</h4>
                            {task.projects?.name && (
                              <p className="mb-1.5 line-clamp-1 text-xs text-muted-foreground">
                                {task.projects.name}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {task.priority && (
                                <Badge
                                  className={cn('text-xs px-1.5 py-0', getPriorityColor(task.priority))}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              {task.deadline && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(task.deadline), 'dd MMM')}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
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

