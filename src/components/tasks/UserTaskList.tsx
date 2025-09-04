import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Clock, AlertCircle, Info } from 'lucide-react';
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
  projects: {
    id: string;
    name: string;
    type: string;
  };
}

interface UserTaskListProps {
  className?: string;
}

export const UserTaskList: React.FC<UserTaskListProps> = ({ className }) => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const taskStatusOptions = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Review'];

  const fetchTasks = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Fetch tasks assigned to the current user with project information
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(id, name, type)
        `)
        .eq('assigned_user_id', profile.id)
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

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in progress':
        return 'secondary';
      case 'to do':
        return 'outline';
      case 'blocked':
        return 'destructive';
      case 'review':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckSquare className="h-4 w-4" />;
      case 'in progress':
        return <Clock className="h-4 w-4" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Sort tasks: completed tasks at the bottom, others by creation date
  const sortedTasks = [...tasks].sort((a, b) => {
    const aCompleted = a.status.toLowerCase() === 'completed';
    const bCompleted = b.status.toLowerCase() === 'completed';
    
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    
    // If both have same completion status, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  useEffect(() => {
    fetchTasks();
  }, [profile?.id]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            My Tasks
          </CardTitle>
          <CardDescription>
            Tasks assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            My Tasks
          </CardTitle>
          <CardDescription>
            Tasks assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No tasks assigned</p>
            <p className="text-sm mt-2">Tasks assigned by project managers will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count tasks by status
  const taskCounts = {
    total: tasks.length,
    todo: tasks.filter(t => t.status.toLowerCase() === 'to do').length,
    inProgress: tasks.filter(t => t.status.toLowerCase() === 'in progress').length,
    completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
    blocked: tasks.filter(t => t.status.toLowerCase() === 'blocked').length,
    review: tasks.filter(t => t.status.toLowerCase() === 'review').length,
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          My Tasks
        </CardTitle>
        <CardDescription>
          {taskCounts.total} task{taskCounts.total !== 1 ? 's' : ''} assigned to you
        </CardDescription>
        
        {/* Task Status Summary */}
        <div className="flex flex-wrap gap-2 mt-4">
          {taskCounts.todo > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {taskCounts.todo} To Do
            </Badge>
          )}
          {taskCounts.inProgress > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {taskCounts.inProgress} In Progress
            </Badge>
          )}
          {taskCounts.review > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {taskCounts.review} Review
            </Badge>
          )}
          {taskCounts.blocked > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {taskCounts.blocked} Blocked
            </Badge>
          )}
          {taskCounts.completed > 0 && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {taskCounts.completed} Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Est. Hours</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className={`${
                    task.status.toLowerCase() === 'completed' 
                      ? 'opacity-60 bg-muted/30' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{task.name}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground max-w-xs truncate" title={task.description}>
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {task.projects.name}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {task.projects.type}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {task.type}
                    </Badge>
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
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              {status}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {task.estimate_hours ? `${task.estimate_hours}h` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(task.created_at), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
