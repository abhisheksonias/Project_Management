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
import { Worklog } from '@/features/worklogs/services/worklogService';
import { Task } from '@/features/tasks/services/taskService';

interface EditWorklogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worklog: Worklog | null;
  tasks: Task[];
  editedHours: string;
  editedNote: string;
  onHoursChange: (hours: string) => void;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const EditWorklogDialog: React.FC<EditWorklogDialogProps> = ({
  open,
  onOpenChange,
  worklog,
  tasks,
  editedHours,
  editedNote,
  onHoursChange,
  onNoteChange,
  onSave,
  isSaving,
}) => {
  const taskName = worklog?.tasks?.name || 
    (worklog?.task_id && tasks.find((t) => t.id === worklog.task_id)?.name) || 
    '';

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
            <Input
              id="edit-task"
              value={taskName}
              readOnly
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />
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

