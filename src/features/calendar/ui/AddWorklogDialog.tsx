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
import { Project } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';
import { format } from 'date-fns';

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
  worklogTime: string;
  onProjectChange: (projectId: string) => void;
  onTaskChange: (taskId: string) => void;
  onHoursChange: (hours: string) => void;
  onNoteChange: (note: string) => void;
  onTimeChange: (time: string) => void;
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
  worklogTime,
  onProjectChange,
  onTaskChange,
  onHoursChange,
  onNoteChange,
  onTimeChange,
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
            Add a new work log entry for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
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
              <Label htmlFor="time">Time</Label>
              <Input
                type="time"
                value={worklogTime}
                onChange={(e) => onTimeChange(e.target.value)}
              />
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

