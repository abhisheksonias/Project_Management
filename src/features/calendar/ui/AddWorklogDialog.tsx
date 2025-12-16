import React, { useState } from 'react';
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
import { Calendar as CalendarIcon } from 'lucide-react';
import { Project } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { normalizeHoursToHHMM } from '@/shared/utils/formatHours';

interface AddWorklogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  selectedTaskId: string;
  worklogHours: string;
  worklogNote: string;
  onProjectChange: (projectId: string) => void;
  onTaskChange: (taskId: string) => void;
  onHoursChange: (hours: string) => void;
  onNoteChange: (note: string) => void;
  onDateChange: (date: Date | null) => void;
  onSave: () => void;
  isSaving: boolean;
  onCancel: () => void;
}

export const AddWorklogDialog: React.FC<AddWorklogDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  projects,
  tasks,
  selectedProjectId,
  selectedTaskId,
  worklogHours,
  worklogNote,
  onProjectChange,
  onTaskChange,
  onHoursChange,
  onNoteChange,
  onDateChange,
  onSave,
  isSaving,
  onCancel,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [internalDate, setInternalDate] = useState<Date | null>(selectedDate || new Date());

  // Sync internal date with prop when dialog opens or selectedDate changes
  React.useEffect(() => {
    if (open) {
      setInternalDate(selectedDate || new Date());
    }
  }, [open, selectedDate]);

  // Filter out completed and on hold tasks first
  const activeTasks = tasks.filter((task) => {
    const taskStatus = (task.status || '').toLowerCase();
    return taskStatus !== 'completed' && taskStatus !== 'on hold';
  });

  // Get unique project IDs from active tasks
  const projectIdsWithActiveTasks = new Set(
    activeTasks
      .map((task) => task.project_id)
      .filter((id): id is string => id !== null && id !== undefined)
  );

  // Filter projects to only show those with active tasks
  const availableProjects = projects.filter((project) => {
    const projectStatus = (project.status || '').toLowerCase();
    const isNotCompletedOrOnHold = projectStatus !== 'completed' && projectStatus !== 'on hold';
    const hasActiveTasks = projectIdsWithActiveTasks.has(project.id);
    return isNotCompletedOrOnHold && hasActiveTasks;
  });

  // Filter tasks by selected project
  const filteredTasks = selectedProjectId
    ? activeTasks.filter((task) => task.project_id === selectedProjectId)
    : activeTasks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Log Work</DialogTitle>
          <DialogDescription>
            Add a new work log entry
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !internalDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {internalDate ? format(internalDate, 'dd/MM/yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={internalDate || undefined}
                    onSelect={(date) => {
                      if (date) {
                        setInternalDate(date);
                        onDateChange(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={(value) => {
                  onProjectChange(value);
                  onTaskChange(''); // Reset task when project changes
                }}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task">Task</Label>
              <Select value={selectedTaskId} onValueChange={onTaskChange}>
                <SelectTrigger id="task">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTasks.map((task) => (
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
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="text"
                placeholder="08:00"
                value={worklogHours}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow typing HH:MM format (e.g., 08:30, 8:30) or decimal (e.g., 8.5)
                  // Pattern: HH:MM format - up to 2 digits, colon, up to 2 digits
                  // Or decimal format - digits with optional decimal point
                  const hhmmPattern = /^\d{0,2}:?\d{0,2}$/;
                  const decimalPattern = /^\d*\.?\d*$/;
                  
                  if (value === '' || hhmmPattern.test(value) || decimalPattern.test(value)) {
                    onHoursChange(value);
                  }
                }}
                onBlur={(e) => {
                  // Normalize to HH:MM format on blur
                  if (e.target.value.trim()) {
                    const normalized = normalizeHoursToHHMM(e.target.value);
                    onHoursChange(normalized);
                  }
                }}
                maxLength={5}
              />
              <div className="flex gap-2 mt-2">
                {['04:00', '08:00', '02:00'].map((val) => (
                  <Button
                    key={val}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-full text-xs"
                    onClick={() => onHoursChange(val)}
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Description (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a description..."
                value={worklogNote}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={5}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isSaving ? 'Saving...' : 'Save Log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

