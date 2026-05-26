import React from 'react';
import { Card } from '@/components/ui/card';
import { Task } from '../services/taskService';

interface TaskStatsCardsProps {
  tasks: Task[];
  completedCountOverride?: number;
}

export const TaskStatsCards: React.FC<TaskStatsCardsProps> = ({
  tasks,
  completedCountOverride,
}) => {
  const stats = React.useMemo(() => {
    // Use exact status match (case-sensitive)
    const toDo = tasks.filter((t) => t.status === 'To Do').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const completed =
      completedCountOverride ?? tasks.filter((t) => t.status === 'Completed').length;
    const blocked = tasks.filter((t) => t.status === 'Blocked').length;
    const review = tasks.filter((t) => t.status === 'Review').length;

    return {
      toDo,
      inProgress,
      completed,
      blocked,
      review,
    };
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">To Do</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.toDo}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">In Progress</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.inProgress}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Completed</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.completed}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Blocked</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.blocked}</p>
      </Card>
      <Card className="p-3 sm:p-4 col-span-2 sm:col-span-1">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Review</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{stats.review}</p>
      </Card>
    </div>
  );
};

