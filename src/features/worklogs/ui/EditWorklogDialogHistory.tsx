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
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { Task } from '@/features/tasks/services/taskService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EditWorklogDialogHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worklog: Worklog | null;
  tasks: Task[];
  editedHours: string;
  editedNote: string;
  editedTaskId: string;
  editedDate: Date | null;
  onHoursChange: (hours: string) => void;
  onNoteChange: (note: string) => void;
  onTaskIdChange: (taskId: string) => void;
  onDateChange: (date: Date | null) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const EditWorklogDialogHistory: React.FC<EditWorklogDialogHistoryProps> = ({
  open,
  onOpenChange,
  worklog,
  tasks,
  editedHours,
  editedNote,
  editedTaskId,
  editedDate,
  onHoursChange,
  onNoteChange,
  onTaskIdChange,
  onDateChange,
  onSave,
  isSaving,
}) => {
  // Filter out completed and on hold tasks
  const availableTasks = tasks.filter((task) => {
    const taskStatus = (task.status || '').toLowerCase();
    return taskStatus !== 'completed' && taskStatus !== 'on hold';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Worklog</DialogTitle>
          <DialogDescription>
            Update the worklog details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !editedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editedDate ? format(editedDate, 'dd/MM/yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={editedDate || undefined}
                  onSelect={(date) => onDateChange(date || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-task">Task *</Label>
            <Select value={editedTaskId || undefined} onValueChange={onTaskIdChange}>
              <SelectTrigger id="edit-task">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-hours">Hours *</Label>
            <Input
              id="edit-hours"
              type="text"
              placeholder="08:00"
              value={editedHours}
              onChange={(e) => onHoursChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-note">Description</Label>
            <RichTextEditor
              value={editedNote}
              onChange={onNoteChange}
              placeholder="Add a description..."
              showToolbar={false}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

