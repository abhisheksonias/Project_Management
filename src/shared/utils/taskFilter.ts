import { Task } from '@/features/tasks/services/taskService';

export interface UserProfile {
  role?: string;
  specialization?: string | null;
  department?: string | null;
}

/**
 * Filter tasks by user's department/specialization
 * Following rules.tasks.category-filter from rules.mdc
 */
export const filterTasksByUserCategory = (tasks: Task[], profile: UserProfile | null): Task[] => {
  if (!profile) return tasks;

  // Admin sees all tasks
  if (profile.role === 'Admin') {
    return tasks;
  }

  // Sales users see all tasks but read-only (no filtering here, handled in UI)
  if (profile.role === 'Sales') {
    return tasks;
  }

  // Filter by category based on specialization/department
  const specialization = (profile.specialization || '').toLowerCase();
  const department = (profile.department || '').toLowerCase();

  if (specialization.includes('design') || department.includes('design')) {
    return tasks.filter((task) => task.category === 'design');
  }

  if (
    specialization.includes('dev') ||
    specialization.includes('development') ||
    department.includes('dev') ||
    department.includes('development')
  ) {
    return tasks.filter((task) => task.category === 'development');
  }

  // Default: return all tasks if no match
  return tasks;
};

