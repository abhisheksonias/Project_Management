import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, MessageCircle, Plus, Info, Filter, X, Search, CheckSquare } from 'lucide-react';
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
  priority: string;
  estimate_hours: number;
  created_at: string;
  updated_at: string;
  assigned_user_id: string;
  project_id: string;
  comment: any;
  assigned_user?: {
    name: string;
  };
  project?: {
    name: string;
  };
}

interface TaskListProps {
  projectId: string | null;
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
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();
  const { profile } = useAuth();

  const taskStatusOptions = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Review'];
  const taskTypeOptions = ['billable', 'non-billable'];
  const priorityOptions = ['Low', 'Medium', 'High'];

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

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .neq('role', 'Admin')
        .order('name');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Build query based on whether we're showing all tasks or project-specific tasks
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users!tasks_assigned_user_id_fkey(name),
          project:projects!tasks_project_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      // If projectId is provided, filter by project, otherwise show all tasks
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

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

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Filter and sort tasks
  useEffect(() => {
    let filtered = tasks;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Apply user filter
    if (userFilter !== 'all') {
      if (userFilter === 'unassigned') {
        filtered = filtered.filter(task => !task.assigned_user_id);
      } else {
        filtered = filtered.filter(task => task.assigned_user_id === userFilter);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.assigned_user?.name && task.assigned_user.name.toLowerCase().includes(query)) ||
        (task.project?.name && task.project.name.toLowerCase().includes(query))
      );
    }

    // Sort tasks: completed tasks at bottom, others by creation date (newest first)
    const sorted = filtered.sort((a, b) => {
      const aCompleted = a.status.toLowerCase() === 'completed';
      const bCompleted = b.status.toLowerCase() === 'completed';
      
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredTasks(sorted);
  }, [tasks, statusFilter, priorityFilter, userFilter, searchQuery]);

  // Group tasks by project
  const groupedTasks = filteredTasks.reduce((groups, task) => {
    const projectName = task.project?.name || 'No Project';
    if (!groups[projectName]) {
      groups[projectName] = [];
    }
    groups[projectName].push(task);
    return groups;
  }, {} as Record<string, Task[]>);

  useEffect(() => {
    fetchTasks();
    if (!projectId) {
      fetchProjects();
      fetchUsers();
    }
  }, [projectId, refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="text-xl">All Tasks</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all your tasks
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-center">
              <p className="text-muted-foreground font-medium">Loading tasks...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch your data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="text-xl">
                {projectId ? `Tasks for ${projectName}` : 'All Tasks'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {projectId 
                  ? `Manage tasks for this project` 
                  : 'Manage and track all your tasks'
                }
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {taskStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Priority:</span>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!projectId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Assignee:</span>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by name, description, assignee, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredTasks.length === 0 ? (
          <div className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <CheckSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No tasks found</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery.trim() 
                    ? `No tasks match "${searchQuery}"`
                    : 'No tasks match your current filters'
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search, status, or priority filters
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold text-left min-w-[200px]">Task Name</TableHead>
                  <TableHead className="font-semibold text-center min-w-[120px]">Type</TableHead>
                  <TableHead className="font-semibold text-center min-w-[120px]">Priority</TableHead>
                  <TableHead className="font-semibold text-center min-w-[150px]">Assignee</TableHead>
                  <TableHead className="font-semibold text-center min-w-[140px]">Status</TableHead>
                  <TableHead className="font-semibold text-center min-w-[120px]">Est. Hours</TableHead>
                  <TableHead className="font-semibold text-center min-w-[120px]">Created</TableHead>
                  <TableHead className="font-semibold text-center min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const isCompleted = task.status?.toLowerCase() === 'completed';
                  return (
                    <TableRow 
                      key={task.id} 
                      className={`hover:bg-muted/30 transition-colors border-b ${
                        isCompleted ? 'opacity-75 bg-muted/20' : ''
                      }`}
                    >
                      <TableCell className="font-medium py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-sm">{task.name}</div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2 max-w-[180px]">
                              {task.description}
                            </div>
                          )}
                          {!projectId && task.project?.name && (
                            <div className="text-xs text-blue-600">
                              {task.project.name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge variant="secondary" className="text-xs">
                          {task.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge 
                          variant={getPriorityBadgeVariant(task.priority)} 
                          className="text-xs"
                        >
                          {task.priority || 'Not Set'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="text-sm">
                          {task.assigned_user ? (
                            <span className="font-medium">{task.assigned_user.name}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {taskStatusOptions.map((status) => (
                              <SelectItem key={status} value={status} className="text-xs">
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="text-sm">
                          {task.estimate_hours ? (
                            <span className="font-medium">{task.estimate_hours}h</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(task.created_at), 'MMM dd')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(task.created_at), 'yyyy')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex justify-center gap-1">
                          {onViewDetails && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(task)}
                              className="h-8 w-8 p-0"
                              title="View Details"
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditTask(task)}
                            className="h-8 w-8 p-0"
                            title="Edit Task"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onTaskComments(task)}
                            className="h-8 w-8 p-0"
                            title="View Comments"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTask(task.id)}
                            className="h-8 w-8 p-0"
                            title="Delete Task"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};