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
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface TaskFiltersProps {
  searchQuery: string;
  project: string;
  status: string;
  priority: string;
  type: string;
  estimate: string;
  category: string;
  deadline: Date | undefined;
  activeFilters: string[];
  onSearchChange: (query: string) => void;
  onProjectChange: (project: string) => void;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onTypeChange: (type: string) => void;
  onEstimateChange: (estimate: string) => void;
  onCategoryChange: (category: string) => void;
  onDeadlineChange: (date: Date | undefined) => void;
  onRemoveFilter: (filter: string) => void;
  onReset: () => void;
  projects?: Array<{ id: string; name: string }>;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchQuery,
  project,
  status,
  priority,
  type,
  estimate,
  category,
  deadline,
  activeFilters,
  onSearchChange,
  onProjectChange,
  onStatusChange,
  onPriorityChange,
  onTypeChange,
  onEstimateChange,
  onCategoryChange,
  onDeadlineChange,
  onRemoveFilter,
  onReset,
  projects = [],
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={project} onValueChange={onProjectChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Projects">All Projects</SelectItem>
            {projects.map((proj) => (
              <SelectItem key={proj.id} value={proj.id}>
                {proj.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Statuses">All Statuses</SelectItem>
            <SelectItem value="To Do">To Do</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Blocked">Blocked</SelectItem>
            <SelectItem value="Review">Review</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Priorities">All Priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Types">All Types</SelectItem>
            <SelectItem value="billable">Billable</SelectItem>
            <SelectItem value="non-billable">non-Billable</SelectItem>
          </SelectContent>
        </Select>

        {/* <Select value={estimate} onValueChange={onEstimateChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estimate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Estimates">All Estimates</SelectItem>
            <SelectItem value="0-2">0-2 hours</SelectItem>
            <SelectItem value="2-4">2-4 hours</SelectItem>
            <SelectItem value="4-8">4-8 hours</SelectItem>
            <SelectItem value="8+">8+ hours</SelectItem>
          </SelectContent>
        </Select> */}

        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Categories">All Categories</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-secondary">
              <Calendar className="mr-2 h-4 w-4" />
              {deadline ? format(deadline, 'PPP') : 'Deadline'}
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
          className="border-primary text-primary hover:bg-primary/5"
          onClick={onReset}
        >
          <X className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Active Filters */}
      {/* {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onRemoveFilter(filter)}
            >
              {filter}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )} */}
    </div>
  );
};

