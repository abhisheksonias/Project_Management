import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { useDashboardProjects } from '@/features/dashboard/hooks/useDashboardProjects';
import { filterTasksByUserCategory } from '@/shared/utils/taskFilter';
import { TaskStatsCards } from '@/features/tasks/ui/TaskStatsCards';
import { TaskFilters } from '@/features/tasks/ui/TaskFilters';
import { TaskViewToggle } from '@/features/tasks/ui/TaskViewToggle';
import { TasksKanbanView } from '@/features/tasks/ui/TasksKanbanView';
import { TasksTableView } from '@/features/tasks/ui/TasksTableView';
import { TaskDetailsPanel } from '@/features/tasks/ui/TaskDetailsPanel';
import { useUpdateTaskStatus } from '@/features/tasks/hooks/useUpdateTaskStatus';
import { Task } from '@/features/tasks/services/taskService';

const Tasks: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // View mode state
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [project, setProject] = useState<string>('All Projects');
  const [status, setStatus] = useState<string>('All Statuses');
  const [priority, setPriority] = useState<string>('All Priorities');
  const [type, setType] = useState<string>('All Types');
  const [estimate, setEstimate] = useState<string>('All Estimates');
  const [category, setCategory] = useState<string>('All Categories');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  
  // Selected task for side panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Fetch data
  const { data: allTasks = [], isLoading } = useTasks(profile?.id || '');
  const { data: projects = [] } = useDashboardProjects(profile?.id || '');
  const updateTaskStatusMutation = useUpdateTaskStatus();

  // Apply category filtering based on user role/specialization
  const tasks = useMemo(() => {
    return filterTasksByUserCategory(allTasks, profile);
  }, [allTasks, profile]);

  // Update selected task when tasks data changes (e.g., after adding comment or acknowledgment)
  useEffect(() => {
    if (selectedTask && tasks.length > 0) {
      const updatedTask = tasks.find((t) => t.id === selectedTask.id);
      if (updatedTask) {
        // Update selectedTask to reflect any changes (comments, etc.)
        setSelectedTask(updatedTask);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude completed and on hold tasks
      const taskStatus = (task.status || '').toLowerCase();
      if (taskStatus === 'completed' || taskStatus === 'on hold') {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !task.name?.toLowerCase().includes(query) &&
          !task.description?.toLowerCase().includes(query) &&
          !task.projects?.name?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Project filter
      if (project !== 'All Projects' && task.project_id !== project) {
        return false;
      }

      // Status filter - use exact match (case-sensitive)
      if (status !== 'All Statuses' && task.status !== status) {
        return false;
      }

      // Priority filter
      if (priority !== 'All Priorities' && task.priority !== priority) {
        return false;
      }

      // Type filter
      if (type !== 'All Types' && task.type !== type) {
        return false;
      }

      // Estimate filter
      if (estimate !== 'All Estimates' && task.estimate_hours) {
        const hours = task.estimate_hours;
        if (estimate === '0-2' && (hours < 0 || hours > 2)) return false;
        if (estimate === '2-4' && (hours < 2 || hours > 4)) return false;
        if (estimate === '4-8' && (hours < 4 || hours > 8)) return false;
        if (estimate === '8+' && hours < 8) return false;
      }

      // Category filter
      if (category !== 'All Categories' && task.category !== category) {
        return false;
      }

      // Deadline filter - show tasks with deadline on or before selected date
      if (deadline && task.deadline) {
        const taskDeadline = new Date(task.deadline);
        const filterDeadline = new Date(deadline);
        // Set time to end of day for filter deadline to include the entire day
        filterDeadline.setHours(23, 59, 59, 999);
        // Compare dates - task deadline should be <= filter deadline
        if (taskDeadline > filterDeadline) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, project, status, priority, type, estimate, category, deadline]);

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (project !== 'All Projects') {
      const projectName = projects.find((p) => p.id === project)?.name || project;
      filters.push(projectName);
    }
    if (status !== 'All Statuses') filters.push(status);
    if (priority !== 'All Priorities') filters.push(`${priority} Priority`);
    if (type !== 'All Types') filters.push(type);
    if (estimate !== 'All Estimates') filters.push(estimate);
    if (category !== 'All Categories') filters.push(category);
    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(deadline);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate.getTime() === today.getTime()) {
        filters.push('Due Today');
      } else {
        filters.push(`Due by ${format(deadline, 'dd MMM yyyy')}`);
      }
    }
    return filters;
  }, [project, status, priority, type, estimate, category, deadline, projects]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setProject('All Projects');
    setStatus('All Statuses');
    setPriority('All Priorities');
    setType('All Types');
    setEstimate('All Estimates');
    setCategory('All Categories');
    setDeadline(undefined);
  };

  const handleRemoveFilter = (filter: string) => {
    // Remove filter based on the filter text
    if (filter === status && status !== 'All Statuses') {
      setStatus('All Statuses');
    } else if (filter.includes('Priority')) {
      const priorityMatch = filter.replace(' Priority', '');
      if (priorityMatch === priority) setPriority('All Priorities');
    } else if (filter === type && type !== 'All Types') {
      setType('All Types');
    } else if (filter === estimate && estimate !== 'All Estimates') {
      setEstimate('All Estimates');
    } else if (filter === category && category !== 'All Categories') {
      setCategory('All Categories');
    } else if (filter === 'Due Today') {
      setDeadline(undefined);
    } else {
      // Check if it's a project name
      const projectMatch = projects.find((p) => p.name === filter);
      if (projectMatch) {
        setProject('All Projects');
      }
    }
  };

  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsPanelOpen(true);
  };

  const handleSidebarNavigation = (tab: string) => {
    if (tab === 'dashboard') {
      navigate('/user/dashboard');
    } else if (tab === 'calendar') {
      navigate('/user/calendar');
    } else if (tab === 'worklog-history') {
      navigate('/user/worklog-history');
    } else if (tab === 'projects') {
      navigate('/user/projects');
    } else if (tab === 'tasks') {
      navigate('/user/tasks');
    } else if (tab === 'reports') {
      navigate('/user/reports');
    } else if (tab === 'shared-tables') {
      navigate('/user/shared-tables');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden mt-16 sm:mt-0 bg-white">
        <UserSidebar currentTab="tasks" onTabChange={handleSidebarNavigation} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden mt-16 sm:mt-0 bg-white">
      <UserSidebar currentTab="tasks" onTabChange={handleSidebarNavigation} />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Tasks</h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Track and manage all your tasks in one place.
              </p>
            </div>
            <TaskViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>

          {/* Stats Cards */}
          <div className="shrink-0">
            <TaskStatsCards tasks={filteredTasks} />
          </div>

          {/* Filters */}
          <div className="shrink-0">
            <TaskFilters
              searchQuery={searchQuery}
              project={project}
              status={status}
              priority={priority}
              type={type}
              estimate={estimate}
              category={category}
              deadline={deadline}
              activeFilters={activeFilters}
              onSearchChange={setSearchQuery}
              onProjectChange={setProject}
              onStatusChange={setStatus}
              onPriorityChange={setPriority}
              onTypeChange={setType}
              onEstimateChange={setEstimate}
              onCategoryChange={setCategory}
              onDeadlineChange={setDeadline}
              onRemoveFilter={handleRemoveFilter}
              onReset={handleResetFilters}
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            />
          </div>

          {/* Tasks List */}
          <div>
            {viewMode === 'kanban' ? (
              <div className="h-[500px] sm:h-[600px] md:h-[calc(100vh-400px)]">
                <TasksKanbanView
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onStatusChange={handleTaskStatusChange}
                />
              </div>
            ) : (
              <div className="rounded-[14px] border border-secondary bg-white">
                <TasksTableView 
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onStatusChange={handleTaskStatusChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Side Panel */}
      <TaskDetailsPanel
        task={selectedTask}
        open={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};

export default Tasks;

