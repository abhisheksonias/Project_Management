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
import { Search, X } from 'lucide-react';
import { Project } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';

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
  return (
    <div className="flex flex-wrap gap-2 items-end">
      <Select value={selectedProject} onValueChange={onProjectChange}>
        <SelectTrigger className="w-[180px]">
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
        <SelectTrigger className="w-[180px]">
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
        <SelectTrigger className="w-[180px]">
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
        className="w-[100px]"
      />

      <Input
        type="number"
        placeholder="Max Hrs"
        value={maxHours}
        onChange={(e) => onMaxHoursChange(e.target.value)}
        className="w-[100px]"
      />

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Button
        variant="outline"
        className="border-primary text-primary hover:bg-primary/5"
        onClick={onReset}
      >
        <X className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  );
};

