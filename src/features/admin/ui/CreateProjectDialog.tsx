import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface NewProjectFormState {
  name: string;
  description: string;
  status: string;
  type: string;
  priority: string;
  deadline: Date | null;
  category: string;
  reference: string;
}

export const createDefaultNewProjectFormState = (): NewProjectFormState => ({
  name: '',
  description: '',
  status: 'Open',
  type: '',
  priority: '',
  deadline: null,
  category: '',
  reference: '',
});

interface CreateProjectDialogProps {
  open: boolean;
  data: NewProjectFormState;
  categoryOptions: Array<{ value: string; label: string }>;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (changes: Partial<NewProjectFormState>) => void;
  onSubmit: () => void;
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  data,
  categoryOptions,
  isSubmitting,
  onOpenChange,
  onChange,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Add a new project to the system. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Project Name *
            </label>
            <Input
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Project Name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Description
            </label>
            <Textarea
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe the project..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Status
              </label>
              <Select
                value={data.status || 'none'}
                onValueChange={(value) => onChange({ status: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Client Approval">Client Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Type *
              </label>
              <Input
                value={data.type}
                onChange={(e) => onChange({ type: e.target.value })}
                placeholder="Enter project type"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Priority
              </label>
              <Select
                value={data.priority || 'none'}
                onValueChange={(value) => onChange({ priority: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Deadline
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal rounded-[14px]',
                      !data.deadline && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.deadline ? format(data.deadline, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-[14px]">
                  <Calendar
                    mode="single"
                    selected={data.deadline || undefined}
                    onSelect={(date) => onChange({ deadline: date ?? null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              <Select
                value={data.category || 'none'}
                onValueChange={(value) => onChange({ category: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Reference
              </label>
              <Input
                value={data.reference}
                onChange={(e) => onChange({ reference: e.target.value })}
                placeholder="Direct, B2B (Client Name)"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[14px]"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              isSubmitting ||
              !data.name.trim() ||
              !data.type.trim()
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


