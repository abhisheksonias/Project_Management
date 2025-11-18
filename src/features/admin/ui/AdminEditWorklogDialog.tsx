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
import { Project } from '@/features/projects/services/projectService';
import { User } from '@/features/users/services/userService';
import { AdminWorklog } from '../services/adminWorklogService';
import { format } from 'date-fns';
import { useUpdateWorklog } from '../hooks/useAdminWorklogs';
import { useQuery } from '@tanstack/react-query';
import { adminTaskService } from '../services/adminTaskService';
import { toast } from 'sonner';
import { normalizeHoursToHHMM } from '@/shared/utils/formatHours';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminEditWorklogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worklog: AdminWorklog | null;
  projects: Project[];
  users: User[];
  onSuccess?: () => void;
}

export const AdminEditWorklogDialog: React.FC<AdminEditWorklogDialogProps> = ({
  open,
  onOpenChange,
  worklog,
  projects,
  users,
  onSuccess,
}) => {
  const [userId, setUserId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [worklogDate, setWorklogDate] = useState<Date | null>(null);

  const updateWorklogMutation = useUpdateWorklog();

  // Filter out admin users
  const filteredUsers = users.filter((user) => user.role !== 'Admin');

  // Fetch tasks for selected project
  const { data: allTasks = [] } = useQuery({
    queryKey: ['admin', 'tasks'],
    queryFn: () => adminTaskService.getAllTasks(),
    enabled: open,
  });

  // Initialize form with worklog data
  useEffect(() => {
    if (worklog && open) {
      setUserId(worklog.user_id || '');
      setProjectId(worklog.project?.id || '');
      setTaskId(worklog.task?.id || '');
      setHours(normalizeHoursToHHMM(worklog.hours));
      setNote(worklog.note || '');
      const logDate = new Date(worklog.created_at);
      setWorklogDate(logDate);
    }
  }, [worklog, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setUserId('');
      setProjectId('');
      setTaskId('');
      setHours('');
      setNote('');
      setWorklogDate(null);
    }
  }, [open]);

  // Get tasks assigned to the selected user
  const userAssignedTasks = useMemo(() => {
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

  // Get projects that have tasks assigned to the selected user
  const userProjects = useMemo(() => {
    if (!userId) {
      return projects.filter(
        (project) => project.status?.toLowerCase() !== 'completed'
      );
    }

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

  // When task is selected, filter projects to show only that task's project
  const availableProjects = useMemo(() => {
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

  // Filter tasks based on selected user and project
  const availableTasks = useMemo(() => {
    if (!userId || !projectId) {
      return [];
    }

    return userAssignedTasks.filter((task) => task.project_id === projectId);
  }, [userId, userAssignedTasks, projectId]);

  // Reset dependent fields when user changes
  useEffect(() => {
    if (userId && userId !== worklog?.user_id) {
      // Only reset if user actually changed
      if (worklog?.user_id !== userId) {
        setProjectId('');
        setTaskId('');
      }
    }
  }, [userId, worklog?.user_id]);

  // Reset task when project changes
  useEffect(() => {
    if (projectId && projectId !== worklog?.project?.id) {
      // Only reset if project actually changed
      if (worklog?.project?.id !== projectId) {
        setTaskId('');
      }
    }
  }, [projectId, worklog?.project?.id]);

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
    if (!worklog?.id) {
      toast.error('Worklog not found');
      return;
    }

    if (!userId || !projectId || !taskId || !hours || !worklogDate) {
      toast.error('Please fill all required fields');
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

      await updateWorklogMutation.mutateAsync({
        worklogId: worklog.id,
        data: {
          user_id: userId,
          task_id: taskId,
          project_id: projectId,
          hours: normalizedHours,
          note: note || null,
          created_at: utcDate.toISOString(),
        },
      });

      toast.success('Worklog updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating worklog:', error);
      toast.error('Error updating worklog');
    }
  };

  if (!worklog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Edit Worklog</DialogTitle>
          <DialogDescription>
            {worklog.created_at && `Edit worklog from ${format(new Date(worklog.created_at), 'dd/MM/yyyy')}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Popover>
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
                    selected={worklogDate || undefined}
                    onSelect={(date) => date && setWorklogDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user">User *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="edit-user" className="rounded-[14px]">
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
              <Label htmlFor="edit-project">Project *</Label>
              <Select
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                }}
                disabled={!userId}
              >
                <SelectTrigger id="edit-project" className="rounded-[14px]">
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
              <Label htmlFor="edit-task">Task *</Label>
              <Select
                value={taskId}
                onValueChange={setTaskId}
                disabled={!userId || !projectId || availableTasks.length === 0}
              >
                <SelectTrigger id="edit-task" className="rounded-[14px]">
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
              <Label htmlFor="edit-hours">Hours *</Label>
              <Input
                id="edit-hours"
                type="text"
                placeholder="08:00"
                value={hours}
                onChange={(e) => {
                  const value = e.target.value;
                  const hhmmPattern = /^\d{0,2}:?\d{0,2}$/;
                  const decimalPattern = /^\d*\.?\d*$/;

                  if (value === '' || hhmmPattern.test(value) || decimalPattern.test(value)) {
                    setHours(value);
                  }
                }}
                onBlur={(e) => {
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-note">Description (optional)</Label>
              <Textarea
                id="edit-note"
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
            disabled={updateWorklogMutation.isPending || !userId || !projectId || !taskId || !hours}
            className="bg-primary text-white hover:bg-primary/90 rounded-[14px]"
          >
            {updateWorklogMutation.isPending ? 'Saving...' : 'Update Log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

