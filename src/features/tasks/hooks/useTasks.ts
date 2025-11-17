import { useQuery } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { Task } from '../services/taskService';

export const useTasks = (userId: string, filters?: { category?: string }) => {
  return useQuery<Task[]>({
    queryKey: ['tasks', userId, filters],
    queryFn: () => taskService.getUserTasks(userId, filters),
    enabled: !!userId,
  });
};

