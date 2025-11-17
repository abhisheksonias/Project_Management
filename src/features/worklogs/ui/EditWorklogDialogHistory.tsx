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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { Task } from '@/features/tasks/services/taskService';

interface EditWorklogDialogHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worklog: Worklog | null;
  tasks: Task[];
  editedHours: string;
  editedNote: string;
  editedTaskId: string;
  onHoursChange: (hours: string) => void;
  onNoteChange: (note: string) => void;
  onTaskIdChange: (taskId: string) => void;
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
  onHoursChange,
  onNoteChange,
  onTaskIdChange,
  onSave,
  isSaving,
}) => {
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
            <Label htmlFor="edit-task">Task *</Label>
            <Select value={editedTaskId || undefined} onValueChange={onTaskIdChange}>
              <SelectTrigger id="edit-task">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
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
            <Textarea
              id="edit-note"
              placeholder="Add a description..."
              value={editedNote}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={4}
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

