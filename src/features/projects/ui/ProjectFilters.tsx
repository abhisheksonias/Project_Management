import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Calendar, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface ProjectFiltersProps {
  searchQuery: string;
  status: string;
  priority: string;
  deadline: Date | undefined;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onDeadlineChange: (date: Date | undefined) => void;
  onReset: () => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  searchQuery,
  status,
  priority,
  deadline,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onDeadlineChange,
  onReset,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-end">
        <div className="relative flex-1 w-full sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Statuses">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Client Approval">Client Approval</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Priorities">All Priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-secondary w-full sm:w-auto text-sm">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="truncate">{deadline ? format(deadline, 'PPP') : 'Deadline'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={deadline}
              onSelect={onDeadlineChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary/5 w-full sm:w-auto text-sm"
          onClick={onReset}
        >
          <X className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

