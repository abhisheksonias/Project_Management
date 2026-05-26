import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUpdateTaskStatus } from '@/features/tasks/hooks/useUpdateTaskStatus';
import { useIsMobile } from '@/hooks/use-mobile';

interface Task {
  id: string;
  name: string;
  projects?: {
    name: string;
  };
  deadline: string | null;
  status: string;
}

interface TopTasksTableProps {
  tasks: Task[];
}

export const TopTasksTable: React.FC<TopTasksTableProps> = ({ tasks }) => {
  const updateTaskStatusMutation = useUpdateTaskStatus();
  const isMobile = useIsMobile();

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
      case 'Done':
        return 'bg-green-100 text-green-800';
      case 'To Do':
        return 'bg-blue-100 text-blue-800';
      case 'Blocked':
        return 'bg-red-100 text-red-800';
      case 'Review':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Mobile Card Layout
  if (isMobile) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Top 8 Assigned Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tasks available
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-3 space-y-2 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm flex-1">{task.name}</h3>
                  <Select
                    value={task.status}
                    onValueChange={(value) => handleStatusChange(task.id, value)}
                  >
                    <SelectTrigger className={cn('w-28 text-xs border-none shadow-none h-7', getStatusColor(task.status))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Project:</span>
                    <span>{task.projects?.name || 'No project'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Due:</span>
                    <span>{formatDate(task.deadline)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  // Desktop Table Layout
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Top 8 Assigned Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-xs sm:text-sm font-semibold">Task Name</th>
                <th className="text-left p-2 text-xs sm:text-sm font-semibold">Project</th>
                <th className="text-left p-2 text-xs sm:text-sm font-semibold">Due Date</th>
                <th className="text-left p-2 text-xs sm:text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-sm text-muted-foreground">
                    No tasks available
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-xs sm:text-sm">{task.name}</td>
                    <td className="p-2 text-xs sm:text-sm text-muted-foreground">
                      {task.projects?.name || 'No project'}
                    </td>
                    <td className="p-2 text-xs sm:text-sm text-muted-foreground">{formatDate(task.deadline)}</td>
                    <td className="p-2">
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                      >
                        <SelectTrigger className={cn('w-32 text-xs border-none shadow-none', getStatusColor(task.status))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="To Do">To Do</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Blocked">Blocked</SelectItem>
                          <SelectItem value="Review">Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

