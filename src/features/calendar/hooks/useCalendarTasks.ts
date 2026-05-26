import { useQuery } from '@tanstack/react-query';
import { taskService, Task } from '@/features/tasks/services/taskService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Get tasks filtered by user's department/specialization
 * - If user has 'design' in specialization/department → filter tasks.category = 'design'
 * - If user has 'dev'/'development' in specialization/department → filter tasks.category = 'development'
 * - If user.role == 'admin' → no category filter
 * - If user.role == 'sales' → read-only (no filter, but read-only access)
 */
export const useCalendarTasks = () => {
  const { profile } = useAuth();

  return useQuery<Task[]>({
    queryKey: ['tasks', profile?.id, 'calendar'],
    queryFn: async () => {
      if (!profile?.id) return [];

      let categoryFilter: string | undefined;

      // Admin sees all tasks
      if (profile.role === 'Admin') {
        categoryFilter = undefined;
      } else {
        // Filter by category based on specialization/department
        const specialization = (profile.specialization || '').toLowerCase();
        const department = (profile.department || '').toLowerCase();

        if (specialization.includes('design') || department.includes('design')) {
          categoryFilter = 'design';
        } else if (
          specialization.includes('dev') ||
          specialization.includes('development') ||
          department.includes('dev') ||
          department.includes('development')
        ) {
          categoryFilter = 'development';
        }
      }

      return taskService.getUserTasks(profile.id, categoryFilter ? { category: categoryFilter } : undefined);
    },
    enabled: !!profile?.id,
  });
};

