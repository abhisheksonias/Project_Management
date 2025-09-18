import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Clock, AlertCircle, Info, MessageSquare, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { TaskComments } from './TaskComments';
import { TaskForm } from './TaskForm';

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
  const [showComments, setShowComments] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
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

      // Filter out completed tasks
      const filteredTasks = (data || []).filter(task => 
        task.status.toLowerCase() !== 'completed'
      );
      setTasks(filteredTasks);
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

  const handleCommentsClick = (task: Task) => {
    setShowComments(task);
  };

  const handleCommentsClose = () => {
    setShowComments(null);
  };

  const handleCommentAdded = () => {
    // Refresh tasks to get updated comments
    fetchTasks();
  };

  const handleCreateTask = () => {
    setShowTaskForm(true);
  };

  const handleTaskFormClose = () => {
    setShowTaskForm(false);
  };

  const handleTaskCreated = () => {
    // Refresh tasks to show the new task
    fetchTasks();
    setShowTaskForm(false);
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            My Tasks
          </CardTitle>
          <CardDescription className="text-sm">
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            My Tasks
          </CardTitle>
          <CardDescription className="text-sm">
            Tasks assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-base font-medium">No tasks assigned</p>
            <p className="text-xs mt-1">Tasks assigned by project managers will appear here.</p>
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
    <div className={className}>
      <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              My Tasks
            </CardTitle>
            <CardDescription className="text-sm">
              {taskCounts.total} task{taskCounts.total !== 1 ? 's' : ''} assigned to you
            </CardDescription>
          </div>
          <Button
            onClick={handleCreateTask}
            size="sm"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 h-7"
          >
            <Plus className="h-3 w-3" />
            Create Task
          </Button>
        </div>
        
        {/* Task Status Summary */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {taskCounts.todo > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
              <Info className="h-3 w-3" />
              {taskCounts.todo} To Do
            </Badge>
          )}
          {taskCounts.inProgress > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
              <Clock className="h-3 w-3" />
              {taskCounts.inProgress} In Progress
            </Badge>
          )}
          {taskCounts.review > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
              <Info className="h-3 w-3" />
              {taskCounts.review} Review
            </Badge>
          )}
          {taskCounts.blocked > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
              <AlertCircle className="h-3 w-3" />
              {taskCounts.blocked} Blocked
            </Badge>
          )}
          {taskCounts.completed > 0 && (
            <Badge variant="default" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
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
              <TableRow className="h-8">
                <TableHead className="text-xs py-2">Task</TableHead>
                <TableHead className="text-xs py-2">Project</TableHead>
                <TableHead className="text-xs py-2">Type</TableHead>
                <TableHead className="text-xs py-2">Status</TableHead>
                <TableHead className="text-xs py-2">Est. Hours</TableHead>
                <TableHead className="text-xs py-2">Created</TableHead>
                <TableHead className="text-xs py-2">Comments</TableHead>
                <TableHead className="text-xs py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className={`h-10 ${
                    task.status.toLowerCase() === 'completed' 
                      ? 'opacity-60 bg-muted/30' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <TableCell className="py-2">
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground max-w-xs truncate" title={task.description}>
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {task.projects.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {task.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Select
                      value={task.status}
                      onValueChange={(value) => handleStatusChange(task.id, value)}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taskStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-1.5">
                              {getStatusIcon(status)}
                              {status}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs">
                      {task.estimate_hours ? `${task.estimate_hours}h` : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-xs">
                      {format(new Date(task.created_at), 'MMM dd')}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">
                        {Array.isArray(task.comment) ? task.comment.length : 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCommentsClick(task)}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 h-7"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {Array.isArray(task.comment) && task.comment.length > 0 ? 'View' : 'Add'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {/* Comments Modal */}
    {showComments && (
      <TaskComments
        task={showComments}
        onClose={handleCommentsClose}
        onCommentAdded={handleCommentAdded}
      />
    )}

    {/* Task Form Modal */}
    {showTaskForm && (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-background border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Create New Task</h2>
              <Button variant="outline" size="sm" onClick={handleTaskFormClose}>
                Close
              </Button>
            </div>
            <TaskForm
              onSuccess={handleTaskCreated}
              onCancel={handleTaskFormClose}
              autoAssignToCurrentUser={true}
            />
          </div>
        </div>
      </div>
    )}
  </div>
  );
};
