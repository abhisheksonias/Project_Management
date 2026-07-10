import { Task } from '@/features/tasks/services/taskService';

export type DeadlineUrgency = 'none' | 'normal' | 'dueToday' | 'overdue';

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getDeadlineUrgency = (deadline: string | null | undefined): DeadlineUrgency => {
  if (!deadline) return 'none';

  const deadlineDate = startOfDay(new Date(deadline));
  const today = startOfDay(new Date());

  if (deadlineDate.getTime() < today.getTime()) return 'overdue';
  if (deadlineDate.getTime() === today.getTime()) return 'dueToday';
  return 'normal';
};

const isCompletedStatus = (status: string | null | undefined): boolean => {
  const lower = (status || '').toLowerCase().trim();
  return lower === 'completed' || lower === 'done' || lower === 'complete';
};

export const getTaskDeadlineUrgency = (task: Task): DeadlineUrgency => {
  if (isCompletedStatus(task.status)) return 'none';
  return getDeadlineUrgency(task.deadline);
};

const urgencyRank: Record<DeadlineUrgency, number> = {
  overdue: 0,
  dueToday: 1,
  normal: 2,
  none: 3,
};

const getUpdatedTimestamp = (task: Task): number => {
  const source = task.updated_at ?? task.created_at;
  return source ? new Date(source).getTime() : 0;
};

export const sortTasksByDeadline = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    const urgencyA = getTaskDeadlineUrgency(a);
    const urgencyB = getTaskDeadlineUrgency(b);

    if (urgencyRank[urgencyA] !== urgencyRank[urgencyB]) {
      return urgencyRank[urgencyA] - urgencyRank[urgencyB];
    }

    if (a.deadline && b.deadline) {
      const deadlineDiff =
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (deadlineDiff !== 0) return deadlineDiff;
    }

    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;

    return getUpdatedTimestamp(b) - getUpdatedTimestamp(a);
  });
};

export const getDeadlineUrgencyClasses = (
  urgency: DeadlineUrgency
): { card: string; text: string; badge?: string } => {
  switch (urgency) {
    case 'overdue':
      return {
        card: 'border-red-300 bg-red-50/60',
        text: 'text-red-600 font-medium',
        badge: 'bg-red-100 text-red-800',
      };
    case 'dueToday':
      return {
        card: 'border-amber-300 bg-amber-50/60',
        text: 'text-amber-700 font-medium',
        badge: 'bg-amber-100 text-amber-800',
      };
    default:
      return {
        card: '',
        text: 'text-muted-foreground',
      };
  }
};

export const getDeadlineUrgencyLabel = (urgency: DeadlineUrgency): string | null => {
  switch (urgency) {
    case 'overdue':
      return 'Overdue';
    case 'dueToday':
      return 'Due today';
    default:
      return null;
  }
};
