import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { UserPageLayout } from '@/shared/ui/UserPageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { useTaskTracker, formatElapsed } from '@/features/task-tracker/hooks/useTaskTracker';
import { TaskTrackerBar } from '@/features/task-tracker/ui/TaskTrackerBar';
import { Button } from '@/components/ui/button';

const TaskTracker: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>('');
  const { data: tasks = [] } = useTasks(profile?.id || '');
  const {
    activeTracker,
    elapsedLabel,
    logs,
    totalTrackedMs,
    trackedByTask,
    startTracking,
    stopTracking,
  } = useTaskTracker(profile?.id);

  const selectedTask = React.useMemo(
    () => tasks.find((task) => task.id === selectedTaskId),
    [tasks, selectedTaskId]
  );

  const projectNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.project_id && task.projects?.name) {
        map.set(task.project_id, task.projects.name);
      }
    });
    return map;
  }, [tasks]);

  const trackedByProject = React.useMemo(() => {
    const grouped = new Map<string, { projectId: string; projectName: string; durationMs: number }>();

    logs.forEach((log) => {
      const projectId = log.projectId;
      if (!projectId) return;

      const current = grouped.get(projectId);
      const projectName = projectNameById.get(projectId) || `Project ${projectId.slice(0, 8)}`;

      if (current) {
        current.durationMs += log.durationMs;
      } else {
        grouped.set(projectId, {
          projectId,
          projectName,
          durationMs: log.durationMs,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.durationMs - a.durationMs);
  }, [logs, projectNameById]);

  const handleStartTracking = () => {
    if (!selectedTask) return;
    startTracking({
      taskId: selectedTask.id,
      taskName: selectedTask.name || 'Untitled Task',
      projectId: selectedTask.project_id,
    });
  };

  const handleSidebarNavigation = (tab: string) => {
    if (tab === 'dashboard') {
      navigate('/user/dashboard');
    } else if (tab === 'calendar') {
      navigate('/user/calendar');
    } else if (tab === 'worklog-history') {
      navigate('/user/worklog-history');
    } else if (tab === 'projects') {
      navigate('/user/projects');
    } else if (tab === 'tasks') {
      navigate('/user/tasks');
    } else if (tab === 'task-tracker') {
      navigate('/user/task-tracker');
    } else if (tab === 'reports') {
      navigate('/user/reports');
    } else if (tab === 'shared-tables') {
      navigate('/user/shared-tables');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    } else if (tab === 'change-requests') {
      navigate('/user/change-requests');
    }
  };

  return (
    <UserPageLayout
      sidebar={<UserSidebar currentTab="task-tracker" onTabChange={handleSidebarNavigation} />}
    >
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Task Tracker</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Track your current task in real-time.
            </p>
          </div>

          <div className="rounded-[14px] border border-secondary bg-white p-4">
            <p className="text-sm font-medium mb-3">Start tracking a task</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="rounded-[12px]">
                  <SelectValue placeholder="Select your task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name || 'Untitled Task'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleStartTracking}
                disabled={!selectedTask}
                className="rounded-[12px]"
              >
                Start
              </Button>
            </div>
          </div>

          {activeTracker ? (
            <TaskTrackerBar
              taskName={activeTracker.taskName}
              elapsedLabel={elapsedLabel}
              onStop={stopTracking}
            />
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-secondary bg-white p-4">
              <p className="text-xs text-muted-foreground">Total tracked (all sessions)</p>
              <p className="text-xl font-semibold mt-1">{formatElapsed(totalTrackedMs)}</p>
            </div>
            <div className="rounded-[14px] border border-secondary bg-white p-4">
              <p className="text-xs text-muted-foreground">Total sessions</p>
              <p className="text-xl font-semibold mt-1">{logs.length}</p>
            </div>
          </div>

          <div className="rounded-[14px] border border-secondary bg-white p-4">
            <p className="text-sm font-medium mb-3">Task-wise continuous total</p>
            {trackedByTask.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracker logs yet.</p>
            ) : (
              <div className="space-y-2">
                {trackedByTask.map((item) => (
                  <div
                    key={item.taskId}
                    className="flex items-center justify-between rounded-[10px] bg-secondary/50 px-3 py-2"
                  >
                    <span className="text-sm truncate pr-2">{item.taskName}</span>
                    <span className="text-sm font-mono">{formatElapsed(item.durationMs)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-secondary bg-white p-4">
            <p className="text-sm font-medium mb-3">Project-wise continuous total</p>
            {trackedByProject.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project logs yet.</p>
            ) : (
              <div className="space-y-2">
                {trackedByProject.map((item) => (
                  <div
                    key={item.projectId}
                    className="flex items-center justify-between rounded-[10px] bg-secondary/50 px-3 py-2"
                  >
                    <span className="text-sm truncate pr-2">{item.projectName}</span>
                    <span className="text-sm font-mono">{formatElapsed(item.durationMs)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-secondary bg-white p-4">
            <p className="text-sm font-medium mb-3">Session logs</p>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-[10px] border border-secondary px-3 py-2"
                  >
                    <p className="text-sm font-medium">{log.taskName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.startedAt).toLocaleString()} -{' '}
                      {new Date(log.endedAt).toLocaleString()}
                    </p>
                    <p className="text-xs font-mono mt-1">{formatElapsed(log.durationMs)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </UserPageLayout>
  );
};

export default TaskTracker;

