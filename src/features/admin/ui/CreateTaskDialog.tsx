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
import { Calendar as CalendarIcon, Users, ChevronDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface NewTaskFormState {
  name: string;
  description: string;
  status: string;
  type: string;
  priority: string;
  project_id: string;
  category: string;
  estimate_hours: string;
  deadline: Date | null;
  assigned_user_ids: string[]; // Multiple user assignments via task_assignees table
}

export const createDefaultNewTaskFormState = (): NewTaskFormState => ({
  name: '',
  description: '',
  status: 'To Do',
  type: 'billable',
  priority: '',
  project_id: 'none',
  category: '',
  estimate_hours: '',
  deadline: null,
  assigned_user_ids: [],
});

interface CreateTaskDialogProps {
  open: boolean;
  data: NewTaskFormState;
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (changes: Partial<NewTaskFormState>) => void;
  onSubmit: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
}

const STATUS_OPTIONS = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Review'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const BILLING_TYPE_OPTIONS = [
  { value: 'billable', label: 'Billable' },
  { value: 'non-billable', label: 'Non-Billable' },
];

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  open,
  data,
  projects,
  users,
  categoryOptions,
  isSubmitting,
  onOpenChange,
  onChange,
  onSubmit,
  title = 'New Task',
  description = 'Add a new task to the system. Fields marked with * are required.',
  submitLabel = 'Create Task',
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Task Name *
            </label>
            <Input
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Task Name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Description
            </label>
            <Textarea
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe the task..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Status
              </label>
              <Select
                value={data.status || 'To Do'}
                onValueChange={(value) => onChange({ status: value })}
              >
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Priority
              </label>
              <Select
                value={data.priority || 'none'}
                onValueChange={(value) =>
                  onChange({ priority: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Billing Type
              </label>
              <Select
                value={data.type || 'billable'}
                onValueChange={(value) => onChange({ type: value })}
              >
                <SelectTrigger className="rounded-[14px] capitalize">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Project
              </label>
              <Select
                value={data.project_id || 'none'}
                onValueChange={(value) =>
                  onChange({ project_id: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Assigned Users
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-between rounded-[14px] font-normal',
                      !data.assigned_user_ids || data.assigned_user_ids.length === 0
                        ? 'text-muted-foreground'
                        : ''
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {data.assigned_user_ids && data.assigned_user_ids.length > 0
                        ? `${data.assigned_user_ids.length} user${
                            data.assigned_user_ids.length > 1 ? 's' : ''
                          } selected`
                        : 'Select users'}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-[14px]" align="start">
                  <div className="p-2">
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {users.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No users available
                        </div>
                      ) : (
                        users.map((user) => {
                          const isSelected =
                            data.assigned_user_ids?.includes(user.id) || false;
                          return (
                            <div
                              key={user.id}
                              className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary cursor-pointer"
                              onClick={() => {
                                const currentIds = data.assigned_user_ids || [];
                                const newIds = isSelected
                                  ? currentIds.filter((id) => id !== user.id)
                                  : [...currentIds, user.id];
                                onChange({ assigned_user_ids: newIds });
                              }}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentIds = data.assigned_user_ids || [];
                                  const newIds = checked
                                    ? [...currentIds, user.id]
                                    : currentIds.filter((id) => id !== user.id);
                                  onChange({ assigned_user_ids: newIds });
                                }}
                              />
                              <label
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                onClick={(e) => e.preventDefault()}
                              >
                                {user.name}
                              </label>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {data.assigned_user_ids && data.assigned_user_ids.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => onChange({ assigned_user_ids: [] })}
                        >
                          Clear selection
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Type
              </label>
              <Input
                value={data.type}
                onChange={(e) => onChange({ type: e.target.value })}
                placeholder="Task type"
              />
            </div> */}

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Estimate (hours)
              </label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={data.estimate_hours}
                onChange={(e) => onChange({ estimate_hours: e.target.value })}
                placeholder="e.g. 4"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              <Select
                value={data.category || 'none'}
                onValueChange={(value) =>
                  onChange({ category: value === 'none' ? '' : value })
                }
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
            disabled={isSubmitting || !data.name.trim() || !data.type.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


