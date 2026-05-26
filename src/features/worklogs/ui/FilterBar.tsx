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
import { Search, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Project } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';
import { useIsMobile } from '@/hooks/use-mobile';

interface FilterBarProps {
  projects: Project[];
  tasks: Task[];
  selectedProject: string;
  selectedTask: string;
  selectedType: string;
  minHours: string;
  maxHours: string;
  searchQuery: string;
  onProjectChange: (project: string) => void;
  onTaskChange: (task: string) => void;
  onTypeChange: (type: string) => void;
  onMinHoursChange: (hours: string) => void;
  onMaxHoursChange: (hours: string) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  projects,
  tasks,
  selectedProject,
  selectedTask,
  selectedType,
  minHours,
  maxHours,
  searchQuery,
  onProjectChange,
  onTaskChange,
  onTypeChange,
  onMinHoursChange,
  onMaxHoursChange,
  onSearchChange,
  onReset,
}) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = selectedProject !== 'All Projects' || 
    selectedTask !== 'All Tasks' || 
    selectedType !== 'All Types' || 
    minHours !== '' || 
    maxHours !== '' || 
    searchQuery !== '';

  return (
    <div className="space-y-3 sm:space-y-0">
      {/* Search Bar - Always Visible */}
      <div className="relative sm:mb-5">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
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
                <span className="h-5 px-1.5 text-xs bg-primary text-white rounded-full">
                  {[selectedProject !== 'All Projects', selectedTask !== 'All Tasks', selectedType !== 'All Types', minHours !== '', maxHours !== ''].filter(Boolean).length}
                </span>
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
              <Select value={selectedProject} onValueChange={onProjectChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Projects">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTask} onValueChange={onTaskChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="All Tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Tasks">All Tasks</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.name}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={onTypeChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Types">All Types</SelectItem>
                  <SelectItem value="Billable">Billable</SelectItem>
                  <SelectItem value="Non-billable">Non-billable</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min Hrs"
                  value={minHours}
                  onChange={(e) => onMinHoursChange(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max Hrs"
                  value={maxHours}
                  onChange={(e) => onMaxHoursChange(e.target.value)}
                  className="text-sm"
                />
              </div>

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
          <Select value={selectedProject} onValueChange={onProjectChange}>
            <SelectTrigger className="w-[180px] text-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Projects">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.name}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTask} onValueChange={onTaskChange}>
            <SelectTrigger className="w-[180px] text-sm">
              <SelectValue placeholder="All Tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Tasks">All Tasks</SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.name}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger className="w-[180px] text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Types">All Types</SelectItem>
              <SelectItem value="Billable">Billable</SelectItem>
              <SelectItem value="Non-billable">Non-billable</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min Hrs"
            value={minHours}
            onChange={(e) => onMinHoursChange(e.target.value)}
            className="w-[100px] text-sm"
          />

          <Input
            type="number"
            placeholder="Max Hrs"
            value={maxHours}
            onChange={(e) => onMaxHoursChange(e.target.value)}
            className="w-[100px] text-sm"
          />

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
    </div>
  );
};

