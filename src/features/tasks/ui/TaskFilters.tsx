import React, { useState } from 'react';
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
import { Search, Calendar, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  user?: string;
  users?: Array<{ id: string; name: string }>;
  onSearchChange: (query: string) => void;
  onProjectChange: (project: string) => void;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onTypeChange: (type: string) => void;
  onEstimateChange: (estimate: string) => void;
  onCategoryChange: (category: string) => void;
  onDeadlineChange: (date: Date | undefined) => void;
  onUserChange?: (userId: string) => void;
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
  user = 'All Users',
  users = [],
  onSearchChange,
  onProjectChange,
  onStatusChange,
  onPriorityChange,
  onTypeChange,
  onEstimateChange,
  onCategoryChange,
  onDeadlineChange,
  onUserChange,
  onRemoveFilter,
  onReset,
  projects = [],
}) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const showUserFilter = Boolean(onUserChange && users.length > 0);

  const hasActiveFilters = project !== 'All Projects' || 
    status !== 'All Statuses' || 
    priority !== 'All Priorities' || 
    type !== 'All Types' || 
    category !== 'All Categories' || 
    deadline !== undefined ||
    user !== 'All Users';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search Bar - Always Visible */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 text-sm"
        />
      </div>

      {/* Mobile: Collapsible Filters */}
      {isMobile ? (
        <>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {activeFilters.length}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="space-y-2 border rounded-lg p-3 bg-secondary/30">
              <Select value={project} onValueChange={onProjectChange}>
                <SelectTrigger className="w-full text-sm">
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
                <SelectTrigger className="w-full text-sm">
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
                <SelectTrigger className="w-full text-sm">
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
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Types">All Types</SelectItem>
                  <SelectItem value="billable">Billable</SelectItem>
                  <SelectItem value="non-billable">non-Billable</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Categories">All Categories</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>

              {showUserFilter && (
                <Select value={user} onValueChange={onUserChange}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Users">All Users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-secondary w-full text-sm">
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
                className="border-primary text-primary hover:bg-primary/5 w-full text-sm"
                onClick={onReset}
              >
                <X className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Desktop: Always Visible Filters */
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={project} onValueChange={onProjectChange}>
            <SelectTrigger className="w-[150px] text-sm">
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
            <SelectTrigger className="w-[150px] text-sm">
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
            <SelectTrigger className="w-[150px] text-sm">
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
            <SelectTrigger className="w-[150px] text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Types">All Types</SelectItem>
              <SelectItem value="billable">Billable</SelectItem>
              <SelectItem value="non-billable">non-Billable</SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[150px] text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Categories">All Categories</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectContent>
          </Select>

          {showUserFilter && (
            <Select value={user} onValueChange={onUserChange}>
              <SelectTrigger className="w-[150px] text-sm">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Users">All Users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-secondary text-sm">
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
            className="border-primary text-primary hover:bg-primary/5 text-sm"
            onClick={onReset}
          >
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      )}

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

