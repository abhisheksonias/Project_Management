import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/features/tasks/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { filterTasksByUserCategory } from '@/shared/utils/taskFilter';
import { useMemo } from 'react';

export const useDashboardTasks = (userId: string) => {
  const { profile } = useAuth();

  const queryResult = useQuery({
    queryKey: ['dashboard-tasks', userId],
    queryFn: () => taskService.getUserTasks(userId),
    enabled: !!userId,
  });

  // Apply task filtering based on user role/specialization
  const tasks = useMemo(() => {
    if (!queryResult.data) return undefined;
    return filterTasksByUserCategory(queryResult.data, profile);
  }, [queryResult.data, profile]);

  return { ...queryResult, data: tasks };
};

export const useDashboardTopTasks = (userId: string, limit: number = 8) => {
  const { profile } = useAuth();

  const queryResult = useQuery({
    queryKey: ['dashboard-tasks', userId],
    queryFn: () => taskService.getUserTasks(userId),
    enabled: !!userId,
  });

  // Apply task filtering and get top tasks
  const topTasks = useMemo(() => {
    if (!queryResult.data) return undefined;
    const filtered = filterTasksByUserCategory(queryResult.data, profile);
    return filtered
      .filter((task) => task.status === 'In Progress' || task.status === 'To Do')
      .sort((a, b) => {
        // Sort by priority (if available) then by deadline
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        if (bPriority !== aPriority) return bPriority - aPriority;
        
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, limit);
  }, [queryResult.data, profile, limit]);

  return { ...queryResult, data: topTasks };
};

