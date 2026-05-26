import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taskTrackerWorklogService } from '@/features/task-tracker/services/taskTrackerWorklogService';

export interface TaskTrackerPayload {
  taskId: string;
  taskName: string;
  projectId?: string | null;
}

interface ActiveTaskTracker extends TaskTrackerPayload {
  userId: string;
  startedAt: string;
}

export interface TaskTrackerLog {
  id: string;
  userId?: string;
  taskId: string;
  taskName: string;
  projectId?: string | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  persistedToDb?: boolean;
}

const getStorageKey = (userId: string) => `pm_task_tracker:${userId}`;
const getLogsStorageKey = (userId: string) => `pm_task_tracker_logs:${userId}`;

export const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}`;
};

export const useTaskTracker = (userId?: string) => {
  const queryClient = useQueryClient();
  const [activeTracker, setActiveTracker] = useState<ActiveTaskTracker | null>(null);
  const [logs, setLogs] = useState<TaskTrackerLog[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(false);

    if (!userId) {
      setActiveTracker(null);
      setLogs([]);
      return;
    }

    try {
      const rawValue = localStorage.getItem(getStorageKey(userId));
      if (!rawValue) {
        setActiveTracker(null);
      } else {
        const parsed = JSON.parse(rawValue) as ActiveTaskTracker;
        if (!parsed?.taskId || !parsed?.startedAt) {
          setActiveTracker(null);
        } else {
          setActiveTracker(parsed);
        }
      }
    } catch {
      setActiveTracker(null);
    }

    try {
      const rawLogs = localStorage.getItem(getLogsStorageKey(userId));
      if (!rawLogs) {
        setLogs([]);
      } else {
        const parsedLogs = JSON.parse(rawLogs) as TaskTrackerLog[];
        if (!Array.isArray(parsedLogs)) {
          setLogs([]);
        } else {
          // Legacy logs (without persistedToDb) were already counted in earlier flows.
          // Mark them as persisted to avoid replaying durations into DB on every refresh.
          const normalizedLogs = parsedLogs.map((log) => ({
            ...log,
            userId: log.userId || userId,
            persistedToDb:
              typeof log.persistedToDb === 'boolean' ? log.persistedToDb : true,
          }));
          setLogs(normalizedLogs);
        }
      }
    } catch {
      setLogs([]);
    }

    setIsHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!activeTracker) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeTracker]);

  useEffect(() => {
    if (!userId || !isHydrated) return;

    if (!activeTracker) {
      localStorage.removeItem(getStorageKey(userId));
      return;
    }

    localStorage.setItem(getStorageKey(userId), JSON.stringify(activeTracker));
  }, [activeTracker, isHydrated, userId]);

  useEffect(() => {
    if (!userId || !isHydrated) return;
    localStorage.setItem(getLogsStorageKey(userId), JSON.stringify(logs));
  }, [isHydrated, logs, userId]);

  const persistLogToDatabase = useCallback(
    async (log: TaskTrackerLog) => {
      const effectiveUserId = log.userId || userId;
      if (!effectiveUserId || !log.projectId || !log.taskId || log.durationMs <= 0) {
        return false;
      }

      await taskTrackerWorklogService.addTrackedDuration({
        userId: effectiveUserId,
        projectId: log.projectId,
        taskId: log.taskId,
        durationMs: log.durationMs,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
      });

      queryClient.invalidateQueries({ queryKey: ['admin', 'task-worklogs', log.taskId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['worklog-history'] });
      queryClient.invalidateQueries({ queryKey: ['worklogs'] });
      return true;
    },
    [queryClient, userId]
  );

  useEffect(() => {
    if (!isHydrated || !userId) return;

    const pendingLogs = logs.filter((log) => !log.persistedToDb);
    if (pendingLogs.length === 0) return;

    pendingLogs.forEach((log) => {
      void persistLogToDatabase(log)
        .then((saved) => {
          if (!saved) return;
          setLogs((prev) =>
            prev.map((item) =>
              item.id === log.id ? { ...item, userId: item.userId || userId, persistedToDb: true } : item
            )
          );
        })
        .catch((error) => {
          console.error('Failed to backfill tracker log in work_logs:', error);
        });
    });
  }, [isHydrated, logs, persistLogToDatabase, userId]);

  const appendLog = useCallback((tracker: ActiveTaskTracker, endTimeMs: number) => {
    const startTimeMs = new Date(tracker.startedAt).getTime();
    const durationMs = Math.max(0, endTimeMs - startTimeMs);
    const endedAt = new Date(endTimeMs).toISOString();

    const newLog: TaskTrackerLog = {
      id: crypto.randomUUID(),
      userId: tracker.userId,
      taskId: tracker.taskId,
      taskName: tracker.taskName,
      projectId: tracker.projectId ?? null,
      startedAt: tracker.startedAt,
      endedAt,
      durationMs,
      persistedToDb: false,
    };

    setLogs((prev) => [newLog, ...prev]);
  }, []);

  const startTracking = useCallback(
    (payload: TaskTrackerPayload) => {
      if (!userId) return;

      const currentTimeMs = Date.now();
      setNow(currentTimeMs);

      if (activeTracker) {
        appendLog(activeTracker, currentTimeMs);
      }

      setActiveTracker({
        userId,
        taskId: payload.taskId,
        taskName: payload.taskName,
        projectId: payload.projectId ?? null,
        startedAt: new Date().toISOString(),
      });
    },
    [activeTracker, appendLog, userId]
  );

  const stopTracking = useCallback(() => {
    const currentTimeMs = Date.now();
    if (activeTracker) {
      appendLog(activeTracker, currentTimeMs);
    }
    setActiveTracker(null);
  }, [activeTracker, appendLog]);

  const elapsedMs = useMemo(() => {
    if (!activeTracker) return 0;
    return Math.max(0, now - new Date(activeTracker.startedAt).getTime());
  }, [activeTracker, now]);

  const totalTrackedMs = useMemo(() => {
    return logs.reduce((total, log) => total + log.durationMs, 0);
  }, [logs]);

  const trackedByTask = useMemo(() => {
    const grouped = new Map<
      string,
      { taskId: string; taskName: string; projectId?: string | null; durationMs: number }
    >();

    logs.forEach((log) => {
      const current = grouped.get(log.taskId);
      if (current) {
        current.durationMs += log.durationMs;
      } else {
        grouped.set(log.taskId, {
          taskId: log.taskId,
          taskName: log.taskName,
          projectId: log.projectId ?? null,
          durationMs: log.durationMs,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.durationMs - a.durationMs);
  }, [logs]);

  return {
    activeTracker,
    logs,
    isTracking: Boolean(activeTracker),
    elapsedMs,
    elapsedLabel: formatElapsed(elapsedMs),
    totalTrackedMs,
    trackedByTask,
    startTracking,
    stopTracking,
  };
};
