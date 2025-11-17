import { useQuery } from '@tanstack/react-query';
import { Task } from '@/features/tasks/services/taskService';
import { adminTaskService } from '@/features/admin/services/adminTaskService';

export const useAdminTasks = () => {
  return useQuery<Task[]>({
    queryKey: ['admin', 'tasks'],
    queryFn: () => adminTaskService.getAllTasks(),
    staleTime: 30000, // 30 seconds
  });
};

