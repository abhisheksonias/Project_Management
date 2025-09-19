import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  UserCheck, 
  User, 
  CalendarIcon, 
  Edit,
  Grid3X3,
  List,
  Filter,
  Search,
  X,
  TrendingUp,
  BarChart3,
  Target,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface WorkLog {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  hours: string;
  note: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
  projects: {
    id: string;
    name: string;
  } | null;
  tasks: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Task {
  id: string;
  name: string;
  project_id: string;
  status: string;
  assigned_user_id: string | null;
}

interface EnhancedWorkLogManagerProps {
  className?: string;
}

export const EnhancedWorkLogManager: React.FC<EnhancedWorkLogManagerProps> = ({ className }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { filterValue, getDateRange } = useFilter();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [hours, setHours] = useState<string>('08:00');
  const [note, setNote] = useState<string>('');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customTime, setCustomTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  // View and filter states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'project' | 'user' | 'date'>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [groupByDate, setGroupByDate] = useState(true);
  const [filters, setFilters] = useState({
    project: 'all-projects',
    user: 'all-users',
    dateRange: 'last10days',
    search: '',
  });

  // Check if user is admin
  if (profile?.role !== 'Admin') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-destructive">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You don't have permission to access this feature.</p>
        </CardContent>
      </Card>
    );
  }

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get date range from unified filter
      const dateRange = getDateRange();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (dateRange) {
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
      }

      // Build query
      let query = supabase
        .from('work_logs')
        .select(`
          *,
          users(id, name, email),
          projects(id, name),
          tasks(id, name, type)
        `)
        .order('created_at', { ascending: false });

      // Apply date filtering
      if (startDate && endDate) {
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      }

      const { data: workLogsData, error: workLogsError } = await query;

      if (workLogsError) throw workLogsError;

      // Fetch users (excluding admin)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'Admin')
        .order('name');

      if (usersError) throw usersError;

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (projectsError) throw projectsError;

      // Fetch tasks with assigned users
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('name');

      if (tasksError) throw tasksError;

      setWorkLogs(workLogsData || []);
      setUsers(usersData || []);
      setProjects(projectsData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load work log data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterValue]);

  const handleCreateWorkLog = () => {
    setEditingWorkLog(null);
    setSelectedProject('');
    setSelectedTask('');
    setSelectedUser('');
    setHours('08:00');
    setNote('');
    setCustomDate(undefined);
    setCustomTime('');
    setIsDialogOpen(true);
  };

  const handleEditWorkLog = (workLog: WorkLog) => {
    setEditingWorkLog(workLog);
    setSelectedProject(workLog.project_id || '');
    setSelectedTask(workLog.task_id || 'no-task');
    setSelectedUser(workLog.user_id);
    setHours(workLog.hours);
    setNote(workLog.note || '');
    
    // Set custom date/time from the work log's created_at
    const createdDate = new Date(workLog.created_at);
    setCustomDate(createdDate);
    setCustomTime(format(createdDate, 'HH:mm'));
    
    setIsDialogOpen(true);
  };

  const handleDeleteWorkLog = async (workLogId: string) => {
    try {
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', workLogId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Work log deleted successfully',
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete work log',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !selectedProject) {
      toast({
        title: 'Error',
        description: 'Please select user and project',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Validate hours format (HH:MM)
      const hoursRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!hoursRegex.test(hours)) {
        toast({
          title: 'Error',
          description: 'Please enter hours in HH:MM format (e.g., 08:30)',
          variant: 'destructive',
        });
        return;
      }

      // Determine the creation date/time
      let createdAt: Date;
      if (customDate && customTime) {
        // Use custom date and time
        const [hoursStr, minutesStr] = customTime.split(':');
        createdAt = new Date(customDate);
        createdAt.setHours(parseInt(hoursStr), parseInt(minutesStr), 0, 0);
      } else if (customDate) {
        // Use custom date with current time
        const now = new Date();
        createdAt = new Date(customDate);
        createdAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      } else {
        // Use current date and time
        createdAt = new Date();
      }

      const workLogData = {
        user_id: selectedUser,
        project_id: selectedProject,
        task_id: selectedTask && selectedTask !== 'no-task' ? selectedTask : null,
        hours: hours,
        note: note.trim() || null,
        added_by: profile?.name || 'Admin',
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
      };

      if (editingWorkLog) {
        // Update existing work log
        const { error } = await supabase
          .from('work_logs')
          .update(workLogData)
          .eq('id', editingWorkLog.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Work log updated successfully',
        });
      } else {
        // Create new work log
        const { error } = await supabase
          .from('work_logs')
          .insert([workLogData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Work log created successfully',
        });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to save work log',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredTasks = () => {
    if (!selectedProject) return [];
    return tasks.filter(task => task.project_id === selectedProject);
  };

  const getAssignedUsers = () => {
    if (!selectedTask || selectedTask === 'no-task') return [];
    const task = tasks.find(t => t.id === selectedTask);
    if (!task?.assigned_user_id) return [];
    return users.filter(user => user.id === task.assigned_user_id);
  };

  const getOtherUsers = () => {
    const assignedUserIds = getAssignedUsers().map(u => u.id);
    return users.filter(user => !assignedUserIds.includes(user.id));
  };

  // Filter and sort work logs
  const getFilteredAndSortedWorkLogs = () => {
    let filtered = workLogs.filter(workLog => {
      if (filters.project !== 'all-projects' && workLog.project_id !== filters.project) return false;
      if (filters.user !== 'all-users' && workLog.user_id !== filters.user) return false;
      if (filters.search && !workLog.users.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !workLog.projects?.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !workLog.tasks?.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });

    // Sort based on selected criteria
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'project':
          const projectA = a.projects?.name || 'No Project';
          const projectB = b.projects?.name || 'No Project';
          return projectA.localeCompare(projectB);
        case 'user':
          return a.users.name.localeCompare(b.users.name);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  };

  const getWorkLogStats = () => {
    const filtered = getFilteredAndSortedWorkLogs();
    const totalHours = filtered.reduce((sum, log) => {
      const [hours, minutes] = log.hours.split(':');
      return sum + parseInt(hours) + (parseInt(minutes) / 60);
    }, 0);
    
    const billableHours = filtered
      .filter(log => log.tasks?.type === 'billable')
      .reduce((sum, log) => {
        const [hours, minutes] = log.hours.split(':');
        return sum + parseInt(hours) + (parseInt(minutes) / 60);
      }, 0);

    return {
      totalEntries: filtered.length,
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      uniqueUsers: new Set(filtered.map(log => log.user_id)).size,
      uniqueProjects: new Set(filtered.map(log => log.project_id).filter(Boolean)).size,
    };
  };

  const clearFilters = () => {
    setFilters({
      project: 'all-projects',
      user: 'all-users',
      dateRange: 'last10days',
      search: '',
    });
  };


  const getGroupedWorkLogs = () => {
    const filtered = getFilteredAndSortedWorkLogs();
    
    if (!groupByDate) {
      return { 'All Work Logs': filtered };
    }

    const grouped: { [key: string]: WorkLog[] } = {};
    
    filtered.forEach(workLog => {
      const dateKey = format(new Date(workLog.created_at), 'yyyy-MM-dd');
      const displayDate = format(new Date(workLog.created_at), 'EEEE, MMMM dd, yyyy');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(workLog);
    });

    // Convert to display format with proper date labels
    const displayGrouped: { [key: string]: WorkLog[] } = {};
    Object.keys(grouped).sort().reverse().forEach(dateKey => {
      const displayDate = format(new Date(dateKey), 'EEEE, MMMM dd, yyyy');
      displayGrouped[displayDate] = grouped[dateKey];
    });

    return displayGrouped;
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'search') return value !== '';
    return value !== '' && !value.startsWith('all-');
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Log Management
          </CardTitle>
          <CardDescription>
            Manage work logs for all users
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

  const stats = getWorkLogStats();
  const filteredWorkLogs = getFilteredAndSortedWorkLogs();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Work Log Management <span className="text-sm text-muted-foreground"> Entries {stats.totalEntries} _______ Unique Users {stats.uniqueUsers}</span>
              </CardTitle>
              <CardDescription>
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreateWorkLog} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Work Log
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingWorkLog ? 'Edit Work Log' : 'Add New Work Log'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingWorkLog ? 'Update the work log details' : 'Create a new work log entry for a user'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="project">Project *</Label>
                      <Select value={selectedProject} onValueChange={(value) => {
                        setSelectedProject(value);
                        setSelectedTask('no-task'); // Reset task when project changes
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                {project.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Task Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="task">Task (Optional)</Label>
                      <Select value={selectedTask} onValueChange={setSelectedTask}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-task">No specific task</SelectItem>
                          {getFilteredTasks().map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              <div className="flex items-center gap-2">
                                <CheckSquare className="h-4 w-4" />
                                {task.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* User Selection with Smart Ordering */}
                    <div className="space-y-2">
                      <Label htmlFor="user">User *</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Show assigned users first */}
                          {getAssignedUsers().length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                Assigned to this task
                              </div>
                              {getAssignedUsers().map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="h-4 w-4 text-green-600" />
                                    {user.name} ({user.email})
                                  </div>
                                </SelectItem>
                              ))}
                              <div className="border-t my-1"></div>
                            </>
                          )}
                          
                          {/* Show other users */}
                          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Other users
                          </div>
                          {getOtherUsers().map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {user.name} ({user.email})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hours Input */}
                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours Worked (HH:MM) *</Label>
                      <Input
                        type="text"
                        placeholder="08:30"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Enter hours in HH:MM format (e.g., 08:30 for 8 hours 30 minutes)</p>
                    </div>

                    {/* Custom Date/Time Selection */}
                    <div className="space-y-2">
                      <Label>Custom Date & Time (Optional)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="customDate" className="text-sm">Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {customDate ? format(customDate, 'PPP') : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={customDate}
                                onSelect={setCustomDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="customTime" className="text-sm">Time</Label>
                          <Input
                            type="time"
                            value={customTime}
                            onChange={(e) => setCustomTime(e.target.value)}
                            placeholder="Select time"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Leave empty to use current date/time. Set both date and time to backdate the entry.
                        </p>
                        {(customDate || customTime) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCustomDate(undefined);
                              setCustomTime('');
                            }}
                            className="text-xs"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Note Input */}
                    <div className="space-y-2">
                      <Label htmlFor="note">Note (Optional)</Label>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any notes about the work performed..."
                        rows={3}
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting 
                          ? (editingWorkLog ? 'Updating...' : 'Adding...') 
                          : (editingWorkLog ? 'Update Work Log' : 'Add Work Log')
                        }
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>


          {/* Filters Section */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search work logs..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-8 h-8"
                    />
                  </div>
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
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort-by" className="text-xs">Sort By</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value: 'project' | 'user' | 'date') => setSortBy(value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date (Newest First)</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="user">User</SelectItem>
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
          {/* View Mode Toggle */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View Mode:</span>
                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Group by Date:</span>
                <Button
                  variant={groupByDate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGroupByDate(!groupByDate)}
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  {groupByDate ? 'Grouped' : 'Ungrouped'}
                </Button>
              </div>
            </div>
          </div>

          {filteredWorkLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Clock className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No work logs found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters ? 'No work logs match the current filters' : 'Get started by creating your first work log'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={handleCreateWorkLog} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Work Log
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(getGroupedWorkLogs()).map(([dateGroup, workLogs]) => (
                <div key={dateGroup} className="space-y-4">
                  {/* Date Group Header */}
                  <div className="flex items-center gap-3">
                    <div className="h-px bg-border flex-1"></div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">{dateGroup}</span>
                      <Badge variant="secondary" className="text-xs">
                        {workLogs.length} log{workLogs.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="h-px bg-border flex-1"></div>
                  </div>

                  {/* Work Logs for this date */}
                  {viewMode === 'grid' ? (
                    // Grid View
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workLogs.map((workLog) => (
                <Card key={workLog.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{workLog.users.name}</div>
                            <div className="text-xs text-muted-foreground">{workLog.users.email}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWorkLog(workLog)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Work Log</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this work log? This action cannot be undone.
                                  <br />
                                  <br />
                                  <strong>User:</strong> {workLog.users.name}
                                  <br />
                                  <strong>Hours:</strong> {workLog.hours}
                                  <br />
                                  <strong>Project:</strong> {workLog.projects?.name || 'No project'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteWorkLog(workLog.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Project & Task */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs">
                            {workLog.projects?.name || 'No Project'}
                          </Badge>
                        </div>
                        {workLog.tasks && (
                          <div className="flex items-center gap-2">
                            <CheckSquare className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">
                              {workLog.tasks.name}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Hours & Type */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="font-mono text-xs">
                            {workLog.hours}
                          </Badge>
                        </div>
                        {workLog.tasks?.type && (
                          <Badge 
                            variant={workLog.tasks.type === 'billable' ? 'default' : 'secondary'}
                            className={`text-xs ${workLog.tasks.type === 'billable' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                          >
                            {workLog.tasks.type === 'billable' ? 'Billable' : 'Non-Billable'}
                          </Badge>
                        )}
                      </div>

                      {/* Note */}
                      {workLog.note && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          {workLog.note}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{format(new Date(workLog.created_at), 'MMM dd, HH:mm')}</span>
                        </div>
                        <span>by {workLog.added_by || 'Unknown'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                    </div>
                  ) : (
                    // List View (Table)
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">User</th>
                            <th className="text-left p-3 font-medium">Project</th>
                            <th className="text-left p-3 font-medium">Task</th>
                            <th className="text-left p-3 font-medium">Type</th>
                            <th className="text-left p-3 font-medium">Hours</th>
                            <th className="text-left p-3 font-medium">Note</th>
                            <th className="text-left p-3 font-medium">Created</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workLogs.map((workLog) => (
                    <tr key={workLog.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{workLog.users.name}</div>
                          <div className="text-xs text-muted-foreground">{workLog.users.email}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        {workLog.projects ? (
                          <Badge variant="secondary" className="text-xs">{workLog.projects.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No project</span>
                        )}
                      </td>
                      <td className="p-3">
                        {workLog.tasks ? (
                          <Badge variant="outline" className="text-xs">{workLog.tasks.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No task</span>
                        )}
                      </td>
                      <td className="p-3">
                        {workLog.tasks?.type ? (
                          <Badge 
                            variant={workLog.tasks.type === 'billable' ? 'default' : 'secondary'}
                            className={`text-xs ${workLog.tasks.type === 'billable' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                          >
                            {workLog.tasks.type === 'billable' ? 'Billable' : 'Non-Billable'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {workLog.hours}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="max-w-xs truncate text-xs" title={workLog.note || ''}>
                          {workLog.note || <span className="text-muted-foreground">No note</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs">
                          <div>{format(new Date(workLog.created_at), 'MMM dd, yyyy')}</div>
                          <div className="text-muted-foreground">{format(new Date(workLog.created_at), 'HH:mm')}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWorkLog(workLog)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Work Log</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this work log? This action cannot be undone.
                                  <br />
                                  <br />
                                  <strong>User:</strong> {workLog.users.name}
                                  <br />
                                  <strong>Hours:</strong> {workLog.hours}
                                  <br />
                                  <strong>Project:</strong> {workLog.projects?.name || 'No project'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteWorkLog(workLog.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
