import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Edit, 
  Trash2, 
  MessageCircle, 
  Plus, 
  Info, 
  Filter, 
  X, 
  Search,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Target,
  FolderOpen
} from 'lucide-react';
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

interface CompactTaskListProps {
  projectId: string | null;
  projectName: string;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onTaskComments: (task: Task) => void;
  onViewDetails?: (task: Task) => void;
  refreshTrigger: number;
}

export const CompactTaskList: React.FC<CompactTaskListProps> = ({
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
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all-types',
    project: 'all-projects',
    user: 'all-users',
    priority: 'all-priorities',
    status: 'all-statuses',
    search: '',
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  const taskStatusOptions = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Review'];
  const taskTypeOptions = ['billable', 'non-billable'];
  const priorityOptions = ['Low', 'Medium', 'High'];

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      const oldStatus = currentTask?.status;

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
        await supabase
          .from('status_history')
          .insert({
            entity_id: taskId,
            entity_type: 'task',
            status: newStatus,
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          });
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

      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
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
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users!tasks_assigned_user_id_fkey(name),
          project:projects!tasks_project_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

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

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'review':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in progress':
        return 'secondary';
      case 'blocked':
        return 'destructive';
      case 'review':
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

  const getTypeBadgeVariant = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'billable':
        return 'default';
      case 'non-billable':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    if (filters.type && filters.type !== 'all-types' && task.type !== filters.type) return false;
    if (filters.project && filters.project !== 'all-projects' && task.project_id !== filters.project) return false;
    if (filters.user && filters.user !== 'all-users' && task.assigned_user_id !== filters.user) return false;
    if (filters.priority && filters.priority !== 'all-priorities' && task.priority !== filters.priority) return false;
    if (filters.status && filters.status !== 'all-statuses' && task.status !== filters.status) return false;
    if (filters.search && !task.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !task.description?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Sort tasks: completed tasks at bottom, others by creation date (newest first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // If one is completed and the other isn't, completed goes to bottom
    const aCompleted = a.status.toLowerCase() === 'completed';
    const bCompleted = b.status.toLowerCase() === 'completed';
    
    if (aCompleted && !bCompleted) return 1; // a goes after b
    if (!aCompleted && bCompleted) return -1; // a goes before b
    
    // If both have same completion status, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const clearFilters = () => {
    setFilters({
      type: 'all-types',
      project: 'all-projects',
      user: 'all-users',
      priority: 'all-priorities',
      status: 'all-statuses',
      search: '',
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'search') return value !== '';
    return value !== '' && !value.startsWith('all-');
  });

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {projectName}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {!projectId && (
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {Object.values(filters).filter(f => f !== '').length}
                  </Badge>
                )}
              </Button>
            )}
            <Button onClick={onCreateTask} className="flex items-center gap-2">
              Add Task
            </Button>
          </div>
        </div>

        {/* Compact Filters Section */}
        {!projectId && showFilters && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search tasks..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-8 h-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-xs">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-statuses">All statuses</SelectItem>
                    {taskStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-filter" className="text-xs">Project</Label>
                <Select
                  value={filters.project}
                  onValueChange={(value) => setFilters({ ...filters, project: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-projects">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-filter" className="text-xs">User</Label>
                <Select
                  value={filters.user}
                  onValueChange={(value) => setFilters({ ...filters, user: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-users">All users</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority-filter" className="text-xs">Priority</Label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => setFilters({ ...filters, priority: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-priorities">All priorities</SelectItem>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type-filter" className="text-xs">Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters({ ...filters, type: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-types">All types</SelectItem>
                    {taskTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end mt-3">
                <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2 h-8">
                  <X className="h-3 w-3" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Target className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters ? 'No tasks match the current filters' : 'Get started by creating your first task'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button onClick={onCreateTask} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <h3 className="font-semibold text-sm truncate">{task.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
                          {task.status}
                        </Badge>
                        <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                          {task.priority || 'Not Set'}
                        </Badge>
                        <Badge variant={getTypeBadgeVariant(task.type)} className="text-xs">
                          {task.type}
                        </Badge>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        <span>{task.project?.name || 'No Project'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{task.assigned_user?.name || 'Unassigned'}</span>
                      </div>
                      {task.estimate_hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.estimate_hours}h</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(task.created_at), 'MMM dd')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
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
                    
                    <div className="flex items-center gap-1">
                      {onViewDetails && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(task)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTask(task)}
                        className="h-8 w-8 p-0"
                        title="Edit Task"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTaskComments(task)}
                        className="h-8 w-8 p-0"
                        title="Comments"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete Task"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
