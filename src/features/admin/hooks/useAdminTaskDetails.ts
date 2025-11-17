import { useQuery } from '@tanstack/react-query';
import { adminTaskService } from '@/features/admin/services/adminTaskService';
import { Task } from '@/features/tasks/services/taskService';

interface UseAdminTaskDetailsOptions {
  enabled?: boolean;
  initialData?: Task | null;
}

export const useAdminTaskDetails = (
  taskId?: string,
  options: UseAdminTaskDetailsOptions = {}
) => {
  const { enabled = true, initialData } = options;

  return useQuery<Task | null>({
    queryKey: ['admin', 'tasks', taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error('Task id is required');
      }
      return adminTaskService.getTaskById(taskId);
    },
    enabled: enabled && Boolean(taskId),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    initialData,
  });
};
