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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 8 Assigned Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">Task Name</th>
                <th className="text-left p-2 font-semibold">Project</th>
                <th className="text-left p-2 font-semibold">Due Date</th>
                <th className="text-left p-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-muted-foreground">
                    No tasks available
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{task.name}</td>
                    <td className="p-2 text-muted-foreground">
                      {task.projects?.name || 'No project'}
                    </td>
                    <td className="p-2 text-muted-foreground">{formatDate(task.deadline)}</td>
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

