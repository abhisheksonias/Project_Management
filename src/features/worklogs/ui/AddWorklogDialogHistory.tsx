import React from 'react';
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
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Project } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';

interface AddWorklogDialogHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  selectedTaskId: string;
  worklogDate: Date | undefined;
  worklogHours: string;
  worklogNote: string;
  onProjectChange: (projectId: string) => void;
  onTaskChange: (taskId: string) => void;
  onDateChange: (date: Date | undefined) => void;
  onHoursChange: (hours: string) => void;
  onNoteChange: (note: string) => void;
  onSave: (addAnother: boolean) => void;
  isSaving: boolean;
  onCancel: () => void;
}

export const AddWorklogDialogHistory: React.FC<AddWorklogDialogHistoryProps> = ({
  open,
  onOpenChange,
  projects,
  tasks,
  selectedProjectId,
  selectedTaskId,
  worklogDate,
  worklogHours,
  worklogNote,
  onProjectChange,
  onTaskChange,
  onDateChange,
  onHoursChange,
  onNoteChange,
  onSave,
  isSaving,
  onCancel,
}) => {
  // Filter out completed and on hold projects
  const availableProjects = projects.filter((project) => {
    const projectStatus = (project.status || '').toLowerCase();
    return projectStatus !== 'completed' && projectStatus !== 'on hold';
  });

  // Filter out completed and on hold tasks, then filter by project
  const filteredTasks = (selectedProjectId
    ? tasks.filter((task) => task.project_id === selectedProjectId)
    : tasks
  ).filter((task) => {
    const taskStatus = (task.status || '').toLowerCase();
    return taskStatus !== 'completed' && taskStatus !== 'on hold';
  });

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

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !worklogDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {worklogDate ? format(worklogDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={worklogDate}
                    onSelect={onDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                onChange={(e) => onHoursChange(e.target.value)}
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
            onClick={() => onSave(true)}
            disabled={isSaving}
            variant="outline"
            className="bg-primary/10 text-primary hover:bg-primary/20"
          >
            {isSaving ? 'Saving...' : 'Save & Add Another'}
          </Button>
          <Button
            onClick={() => onSave(false)}
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

