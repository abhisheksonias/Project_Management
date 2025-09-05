import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, Plus, Trash2, Users, FolderOpen, CheckSquare, UserCheck, User, CalendarIcon, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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

interface AdminWorkLogManagerProps {
  className?: string;
}

export const AdminWorkLogManager: React.FC<AdminWorkLogManagerProps> = ({ className }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
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

      // Fetch work logs with related data, sorted by latest first
      const { data: workLogsData, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users(id, name, email),
          projects(id, name),
          tasks(id, name, type)
        `)
        .order('created_at', { ascending: false });

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
  }, []);

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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Work Log Management
            </CardTitle>
            <CardDescription>
              Add and manage work logs for users ({workLogs.length} total entries)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateWorkLog}>
                <Plus className="mr-2 h-4 w-4" />
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
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workLogs.map((workLog) => (
                <TableRow key={workLog.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{workLog.users.name}</div>
                      <div className="text-sm text-muted-foreground">{workLog.users.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {workLog.projects ? (
                      <Badge variant="secondary">{workLog.projects.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">No project</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {workLog.tasks ? (
                      <Badge variant="outline">{workLog.tasks.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">No task</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {workLog.tasks?.type ? (
                      <Badge 
                        variant={workLog.tasks.type === 'billable' ? 'default' : 'secondary'}
                        className={workLog.tasks.type === 'billable' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-orange-100 text-orange-800 hover:bg-orange-200'}
                      >
                        {workLog.tasks.type === 'billable' ? 'Billable' : 'Non-Billable'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {workLog.hours}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={workLog.note || ''}>
                      {workLog.note || <span className="text-muted-foreground">No note</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {workLog.added_by || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(workLog.created_at), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(workLog.created_at), 'HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditWorkLog(workLog)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {workLogs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No work logs found</p>
            <p className="text-sm mt-2">Create the first work log entry to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};