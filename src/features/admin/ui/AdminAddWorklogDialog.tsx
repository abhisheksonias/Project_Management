import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { Project } from '@/features/projects/services/projectService';
import { User } from '@/features/users/services/userService';
import { format } from 'date-fns';
import { useCreateWorklogForUser } from '../hooks/useAdminWorklogs';
import { useQuery } from '@tanstack/react-query';
import { adminTaskService } from '../services/adminTaskService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { normalizeHoursToHHMM, parseHours } from '@/shared/utils/formatHours';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSingleMilestoneHoursSummary } from '@/features/milestones/hooks/useMilestones';

interface AdminAddWorklogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedUserId?: string;
  projects: Project[];
  users: User[];
  onSuccess?: () => void;
}

export const AdminAddWorklogDialog: React.FC<AdminAddWorklogDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  selectedUserId,
  projects,
  users,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [userId, setUserId] = useState<string>(selectedUserId || '');
  const [projectId, setProjectId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [worklogDate, setWorklogDate] = useState<Date>(selectedDate);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const createWorklogMutation = useCreateWorklogForUser();

  // Filter out admin users
  const filteredUsers = users.filter((user) => user.role !== 'Admin');

  // Fetch tasks for selected project
  const { data: allTasks = [] } = useQuery({
    queryKey: ['admin', 'tasks'],
    queryFn: () => adminTaskService.getAllTasks(),
    enabled: open,
  });

  // First, get tasks assigned to the selected user (excluding completed tasks)
  const userAssignedTasks = React.useMemo(() => {
    if (!userId) {
      return [];
    }

    return allTasks.filter((task) => {
      // Exclude completed tasks
      if (task.status === 'Completed') {
        return false;
      }

      // Check assignees from task_assignees table
      if (task.assignees && task.assignees.length > 0) {
        return task.assignees.some((assignee) => assignee.user_id === userId);
      }
      return false;
    });
  }, [allTasks, userId]);

  // Get projects that have tasks assigned to the selected user (excluding completed projects)
  const userProjects = React.useMemo(() => {
    if (!userId) {
      // Filter out completed projects even when no user is selected
      return projects.filter(
        (project) => project.status?.toLowerCase() !== 'completed'
      );
    }

    // Get unique project IDs from tasks assigned to the user
    const userTaskProjectIds = new Set(
      userAssignedTasks
        .map((task) => task.project_id)
        .filter((id): id is string => id !== null && id !== undefined)
    );

    return projects.filter(
      (project) =>
        userTaskProjectIds.has(project.id) &&
        project.status?.toLowerCase() !== 'completed'
    );
  }, [projects, userId, userAssignedTasks]);

  // When task is selected, filter projects to show only that task's project (excluding completed)
  const availableProjects = React.useMemo(() => {
    if (taskId) {
      const selectedTask = allTasks.find((t) => t.id === taskId);
      if (selectedTask?.project_id) {
        return projects.filter(
          (p) =>
            p.id === selectedTask.project_id &&
            p.status?.toLowerCase() !== 'completed'
        );
      }
      return [];
    }
    return userProjects;
  }, [taskId, allTasks, projects, userProjects]);

  // Filter tasks based on selected user and project (tasks only shown when project is selected)
  const availableTasks = React.useMemo(() => {
    if (!userId || !projectId) {
      return [];
    }

    // Only show tasks when both user and project are selected
    return userAssignedTasks.filter((task) => task.project_id === projectId);
  }, [userId, userAssignedTasks, projectId]);

  const selectedTask = React.useMemo(
    () => allTasks.find((t) => t.id === taskId),
    [allTasks, taskId]
  );
  const selectedMilestoneId = selectedTask?.milestone_id || null;
  const { data: milestoneHoursSummary } = useSingleMilestoneHoursSummary(
    selectedMilestoneId,
    { enabled: open && !!selectedMilestoneId }
  );
  const pendingDecimalHours = parseHours(hours);
  const currentLoggedHours = milestoneHoursSummary?.logged_hours ?? 0;
  const projectedHours = currentLoggedHours + pendingDecimalHours;
  const allotted = milestoneHoursSummary?.allotted_hours ?? null;
  const alreadyExceeded =
    !!milestoneHoursSummary &&
    milestoneHoursSummary.is_hourly &&
    allotted !== null &&
    currentLoggedHours > allotted;
  const willExceed =
    !!milestoneHoursSummary &&
    milestoneHoursSummary.is_hourly &&
    allotted !== null &&
    pendingDecimalHours > 0 &&
    projectedHours > allotted;
  const shouldWarn = alreadyExceeded || willExceed;
  const overage =
    allotted !== null ? Math.max(projectedHours - allotted, 0) : null;

  useEffect(() => {
    if (selectedUserId) {
      // Only set userId if the selected user is not an admin
      const selectedUser = filteredUsers.find((u) => u.id === selectedUserId);
      if (selectedUser && selectedUser.role !== 'Admin') {
        setUserId(selectedUserId);
      } else {
        setUserId('');
      }
    }
  }, [selectedUserId, filteredUsers]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setUserId(selectedUserId || '');
      setProjectId('');
      setTaskId('');
      setHours('');
      setNote('');
      setWorklogDate(selectedDate);
    }
  }, [open, selectedUserId, selectedDate]);

  // Sync worklogDate with selectedDate prop when dialog opens
  useEffect(() => {
    if (open) {
      setWorklogDate(selectedDate);
    }
  }, [open, selectedDate]);

  // Reset dependent fields when user changes
  useEffect(() => {
    if (userId) {
      // Reset project and task when user changes
      setProjectId('');
      setTaskId('');
    }
  }, [userId]);

  // Reset task when project changes
  useEffect(() => {
    if (projectId) {
      setTaskId('');
    }
  }, [projectId]);

  // Auto-select project when task is selected
  useEffect(() => {
    if (taskId && !projectId) {
      const selectedTask = allTasks.find((t) => t.id === taskId);
      if (selectedTask?.project_id) {
        setProjectId(selectedTask.project_id);
      }
    }
  }, [taskId, projectId, allTasks]);

  const handleSave = async () => {
    if (!userId || !projectId || !taskId || !hours) {
      toast.error('Please fill all required fields');
      return;
    }

    // Prevent creating worklogs for admin users
    const selectedUser = filteredUsers.find((u) => u.id === userId);
    if (selectedUser?.role === 'Admin') {
      toast.error('Cannot create worklogs for admin users');
      return;
    }

    // Normalize hours to HH:MM format
    const normalizedHours = normalizeHoursToHHMM(hours);
    
    // Validate that hours is not 00:00
    if (normalizedHours === '00:00' && hours.trim() !== '0' && hours.trim() !== '0:00' && hours.trim() !== '00:00') {
      toast.error('Please enter valid hours');
      return;
    }

    // Check if hours is actually 0
    const [h, m] = normalizedHours.split(':');
    const totalMinutes = parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
    if (totalMinutes <= 0) {
      toast.error('Hours must be greater than 0');
      return;
    }

    if (!profile?.id) {
      toast.error('User profile not found');
      return;
    }

    try {
      // Use current time with selected date, preserving timezone
      const now = new Date();
      const year = worklogDate.getFullYear();
      const month = worklogDate.getMonth();
      const day = worklogDate.getDate();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // Create date in local timezone with current time
      const utcDate = new Date(year, month, day, hours, minutes, seconds, 0);

      await createWorklogMutation.mutateAsync({
        user_id: userId,
        task_id: taskId,
        project_id: projectId,
        hours: normalizedHours, // Store in HH:MM format
        note: note || null,
        created_at: utcDate.toISOString(),
        added_by: profile.id,
      });

      toast.success('Worklog added successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating worklog:', error);
      toast.error('Error adding worklog');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Add Worklog</DialogTitle>
          <DialogDescription>
            Add a new work log entry
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal rounded-[14px]',
                      !worklogDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {worklogDate ? format(worklogDate, 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-[14px]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={worklogDate}
                    onSelect={(date) => {
                      if (date) {
                        setWorklogDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">User *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="user" className="rounded-[14px]">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="rounded-[14px]">
                  {filteredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                }}
                disabled={!userId}
              >
                <SelectTrigger id="project" className="rounded-[14px]">
                  <SelectValue 
                    placeholder={
                      !userId
                        ? 'Select user first' 
                        : availableProjects.length === 0 
                        ? 'No projects available' 
                        : 'Select a project'
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="rounded-[14px]">
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task">Task *</Label>
              <Select 
                value={taskId} 
                onValueChange={setTaskId} 
                disabled={!userId || !projectId || availableTasks.length === 0}
              >
                <SelectTrigger id="task" className="rounded-[14px]">
                  <SelectValue 
                    placeholder={
                      !userId 
                        ? 'Select user first' 
                        : !projectId
                        ? 'Select project first'
                        : availableTasks.length === 0 
                        ? 'No tasks available' 
                        : 'Select a task'
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="rounded-[14px]">
                  {availableTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours *</Label>
              <Input
                id="hours"
                type="text"
                placeholder="08:00"
                value={hours}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow typing HH:MM format (e.g., 08:30, 8:30) or decimal (e.g., 8.5)
                  // Pattern: HH:MM format - up to 2 digits, colon, up to 2 digits
                  // Or decimal format - digits with optional decimal point
                  const hhmmPattern = /^\d{0,2}:?\d{0,2}$/;
                  const decimalPattern = /^\d*\.?\d*$/;
                  
                  if (value === '' || hhmmPattern.test(value) || decimalPattern.test(value)) {
                    setHours(value);
                  }
                }}
                onBlur={(e) => {
                  // Normalize to HH:MM format on blur
                  if (e.target.value.trim()) {
                    const normalized = normalizeHoursToHHMM(e.target.value);
                    setHours(normalized);
                  }
                }}
                maxLength={5}
                className="rounded-[14px]"
              />
              <p className="text-xs text-muted-foreground">Enter hours in HH:MM format (e.g., 08:00 for 8 hours)</p>
              <div className="flex gap-2 mt-2">
                {['04:00', '08:00', '02:00'].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-[14px] text-xs"
                    onClick={() => setHours(val)}
                  >
                    {val}
                  </Button>
                ))}
              </div>
              {selectedMilestoneId && milestoneHoursSummary?.is_hourly && (
                <div className="mt-3 rounded-[12px] border border-secondary/70 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                  Logged {milestoneHoursSummary.logged_hours.toFixed(1)}h
                  {allotted !== null && ` / ${allotted.toFixed(1)}h`}
                  {milestoneHoursSummary.remaining_hours !== null &&
                    ` • ${milestoneHoursSummary.remaining_hours.toFixed(1)}h remaining`}
                </div>
              )}
              {shouldWarn && (
                <Alert className="mt-3 rounded-[12px] border-amber-300 bg-amber-50 text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Hourly cap warning</AlertTitle>
                  <AlertDescription className="text-xs">
                    {alreadyExceeded
                      ? 'This milestone has already exceeded its allotted hours.'
                      : `This log will exceed the allotted hours by ${
                          overage?.toFixed(1) ?? '0.0'
                        }h.`}
                    {' '}You can continue, but please review with the client.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Description (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a description..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                className="rounded-[14px]"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-[14px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createWorklogMutation.isPending || !userId || !projectId || !taskId || !hours}
            className="bg-primary text-white hover:bg-primary/90 rounded-[14px]"
          >
            {createWorklogMutation.isPending ? 'Saving...' : 'Save Log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

