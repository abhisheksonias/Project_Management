import { useMemo } from 'react';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { Task } from '@/features/tasks/services/taskService';

interface DashboardStats {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  tasksInProgress: number;
  tasksCompleted: number;
  loggedDays: string[];
}

export const useDashboardStats = (
  worklogs: Worklog[] | undefined,
  tasks: Task[] | undefined
): DashboardStats => {
  return useMemo(() => {
    if (!worklogs) {
      return {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        tasksInProgress: 0,
        tasksCompleted: 0,
        loggedDays: [],
      };
    }

    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    const loggedDaysSet = new Set<string>();

    worklogs.forEach((log) => {
      // Parse hours from HH:MM format
      const [hoursStr, minutesStr] = log.hours.split(':');
      const hours = parseInt(hoursStr) + parseInt(minutesStr) / 60;

      totalHours += hours;

      // Check if billable based on task or project type
      const taskType = log.tasks?.type?.toLowerCase();

      if (taskType === 'billable') {
        billableHours += hours;
      } else {
        nonBillableHours += hours;
      }

      // Track logged days
      const dateStr = log.created_at.split('T')[0];
      loggedDaysSet.add(dateStr);
    });

    // Count task stats
    const tasksInProgress = tasks?.filter((task) => task.status === 'In Progress').length || 0;
    const tasksCompleted = tasks?.filter((task) => task.status === 'Completed').length || 0;

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      tasksInProgress,
      tasksCompleted,
      loggedDays: Array.from(loggedDaysSet),
    };
  }, [worklogs, tasks]);
};
