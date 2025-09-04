import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, MessageCircle, Plus, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Task {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  estimate_hours: number;
  created_at: string;
  updated_at: string;
  assigned_user_id: string;
  project_id: string;
  comment: any;
  assigned_user?: {
    name: string;
  };
}

interface TaskListProps {
  projectId: string;
  projectName: string;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onTaskComments: (task: Task) => void;
  onViewDetails?: (task: Task) => void;
  refreshTrigger: number;
}

export const TaskList: React.FC<TaskListProps> = ({
  projectId,
  projectName,
  onCreateTask,
  onEditTask,
  onTaskComments,
  onViewDetails,
  refreshTrigger,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  const taskStatusOptions = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Review'];

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      // Find the current task to get the old status
      const currentTask = tasks.find(t => t.id === taskId);
      const oldStatus = currentTask?.status;

      // Update task status
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update task status',
          variant: 'destructive',
        });
        return;
      }

      // Log status change in history
      if (profile?.id && oldStatus !== newStatus) {
        const { error: historyError } = await supabase
          .from('status_history')
          .insert({
            entity_id: taskId,
            entity_type: 'task',
            status: newStatus,
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          });

        if (historyError) {
          console.error('Error logging status change:', historyError);
          // Don't show error to user as the main operation succeeded
        }
      }

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, status: newStatus }
            : task
        )
      );

      toast({
        title: 'Success',
        description: 'Task status updated successfully',
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      });
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks with assigned user names
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users!tasks_assigned_user_id_fkey(name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tasks',
          variant: 'destructive',
        });
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This will also remove related work logs.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete task',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });

      fetchTasks(); // Refresh the list
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in progress':
        return 'secondary';
      case 'to do':
        return 'outline';
      default:
        return 'outline';
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId, refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading tasks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tasks for {projectName}</CardTitle>
            <p className="text-muted-foreground">{tasks.length} task(s) found</p>
          </div>
          <Button onClick={onCreateTask}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No tasks found for this project</p>
            <Button onClick={onCreateTask}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Task
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Est. Hours</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>{task.type}</TableCell>
                    <TableCell className="max-w-xs truncate" title={task.description}>
                      {task.description}
                    </TableCell>
                    <TableCell>
                      {task.assigned_user?.name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taskStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{task.estimate_hours || 'N/A'}</TableCell>
                    <TableCell>
                      {task.created_at && format(new Date(task.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {task.updated_at && format(new Date(task.updated_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {onViewDetails && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(task)}
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditTask(task)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTaskComments(task)}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};