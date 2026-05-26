import React, { useMemo, useState } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useAdminTasks } from '@/features/admin/hooks/useAdminTasks';
import { useAdminProjects } from '@/features/admin/hooks/useAdminProjects';
import { Task } from '@/features/tasks/services/taskService';
import { TaskStatsCards } from '@/features/tasks/ui/TaskStatsCards';
import { TaskFilters } from '@/features/tasks/ui/TaskFilters';
import { TaskViewToggle } from '@/features/tasks/ui/TaskViewToggle';
import { TasksKanbanView } from '@/features/tasks/ui/TasksKanbanView';
import { TasksTableView } from '@/features/tasks/ui/TasksTableView';
import { AdminTaskDetailsPanel } from '@/features/admin/ui/AdminTaskDetailsPanel';
import {
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatusAdmin,
} from '@/features/admin/hooks/useAdminTaskMutations';
import {
  CreateTaskDialog,
  NewTaskFormState,
  createDefaultNewTaskFormState,
} from '@/features/admin/ui/CreateTaskDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/features/users/services/userService';
import { useAdminProjectsForFilter } from '@/features/admin/hooks/useAdminProjects';
import { useAllMilestones } from '@/features/milestones/hooks/useMilestones';

const CATEGORY_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
];

const AdminTasks: React.FC = () => {
  const { profile } = useAuth();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [deadlineFilter, setDeadlineFilter] = useState<Date | undefined>(undefined);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [newTaskData, setNewTaskData] = useState<NewTaskFormState>(() =>
    createDefaultNewTaskFormState()
  );

  const { data: tasks = [], isLoading } = useAdminTasks();
  const { data: adminProjects = [] } = useAdminProjects();
  const { data: projectFilterOptions = [] } = useAdminProjectsForFilter();
  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userService.getAllUsers(),
    staleTime: 300000,
  });
  const { data: allMilestones = [] } = useAllMilestones();

  const createTaskMutation = useCreateTask();
  const updateStatusMutation = useUpdateTaskStatusAdmin();
  const updateTaskMutation = useUpdateTask();
  const [categoryUpdatingId, setCategoryUpdatingId] = useState<string | null>(null);

  const resetNewTaskForm = () => {
    setNewTaskData(createDefaultNewTaskFormState());
  };

  const handleOpenCreateDialog = () => {
    resetNewTaskForm();
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    resetNewTaskForm();
  };

  const projectsForSelect = useMemo(
    () => adminProjects
      .map((project) => ({ id: project.id, name: project.name })),
    [adminProjects]
  );

  const usersForSelect = useMemo(
    () => users
      .filter((user) => user.role !== 'Admin')
      .map((user) => ({ id: user.id, name: user.name, department: user.department })),
    [users]
  );
  
  const milestonesForSelect = useMemo(
    () => allMilestones.map((m) => ({
      id: m.id,
      name: m.name,
      project_id: m.project_id,
    })),
    [allMilestones]
  );

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
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

      if (projectFilter !== 'All Projects' && task.project_id !== projectFilter) {
        return false;
      }

      if (statusFilter === 'All Statuses') {
        // Hide completed tasks unless explicitly filtered
        if (task.status === 'Completed') {
          return false;
        }
      } else if (task.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== 'All Priorities' && task.priority !== priorityFilter) {
        return false;
      }

      if (typeFilter !== 'All Types' && task.type !== typeFilter) {
        return false;
      }

      if (categoryFilter !== 'All Categories' && task.category !== categoryFilter) {
        return false;
      }

      if (deadlineFilter) {
        if (!task.deadline) {
          return false;
        }

        const taskDeadline = new Date(task.deadline);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const selectedStart = new Date(deadlineFilter);
        selectedStart.setHours(0, 0, 0, 0);
        const selectedEnd = new Date(deadlineFilter);
        selectedEnd.setHours(23, 59, 59, 999);

        const rangeStart =
          todayStart.getTime() < selectedStart.getTime() ? todayStart : selectedStart;
        const rangeEnd =
          todayEnd.getTime() > selectedEnd.getTime() ? todayEnd : selectedEnd;

        if (
          taskDeadline.getTime() < rangeStart.getTime() ||
          taskDeadline.getTime() > rangeEnd.getTime()
        ) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const getTimestamp = (task: Task) => {
        const source = task.updated_at ?? task.created_at;
        return source ? new Date(source).getTime() : 0;
      };

      return getTimestamp(b) - getTimestamp(a);
    });
  }, [
    tasks,
    searchQuery,
    projectFilter,
    statusFilter,
    priorityFilter,
    typeFilter,
    categoryFilter,
    deadlineFilter,
  ]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === 'Completed').length,
    [tasks]
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setProjectFilter('All Projects');
    setStatusFilter('All Statuses');
    setPriorityFilter('All Priorities');
    setTypeFilter('All Types');
    setCategoryFilter('All Categories');
    setDeadlineFilter(undefined);
  };

  const handleCreateTask = () => {
    const trimmedName = newTaskData.name.trim();
    const trimmedType = newTaskData.type.trim();

    if (!trimmedName || !trimmedType || !newTaskData.project_id || newTaskData.project_id === 'none') {
      return;
    }

    createTaskMutation.mutate(
      {
        name: trimmedName,
        description: newTaskData.description.trim() || null,
        status: newTaskData.status || 'To Do',
        type: trimmedType,
        priority: newTaskData.priority || null,
        deadline: newTaskData.deadline ? newTaskData.deadline.toISOString() : null,
        project_id: newTaskData.project_id || null,
        category:
          newTaskData.category && newTaskData.category !== 'none'
            ? newTaskData.category
            : null,
        estimate_hours: newTaskData.estimate_hours
          ? Number(newTaskData.estimate_hours)
          : null,
        assigned_user_ids: newTaskData.assigned_user_ids || [],
        milestone_id:
          newTaskData.milestone_id && newTaskData.milestone_id !== 'none'
            ? newTaskData.milestone_id
            : null,
      },
      {
        onSuccess: () => {
          handleCloseCreateDialog();
        },
      }
    );
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsPanelOpen(true);
  };

  const handleInlineStatusChange = (taskId: string, newStatus: string) => {
    updateStatusMutation.mutate({ taskId, status: newStatus });
  };

  const handleInlineCategoryChange = (
    taskId: string,
    category: 'design' | 'development' | null
  ) => {
    setCategoryUpdatingId(taskId);
    updateTaskMutation.mutate(
      {
        taskId,
        data: { category },
      },
      {
        onSettled: () => setCategoryUpdatingId(null),
      }
    );
  };

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (projectFilter !== 'All Projects') {
      const projectName =
        adminProjects.find((p) => p.id === projectFilter)?.name || projectFilter;
      filters.push(projectName);
    }
    if (statusFilter !== 'All Statuses') filters.push(statusFilter);
    if (priorityFilter !== 'All Priorities') filters.push(`${priorityFilter} Priority`);
    if (typeFilter !== 'All Types') filters.push(typeFilter);
    if (categoryFilter !== 'All Categories') filters.push(categoryFilter);
    if (deadlineFilter) {
      filters.push(`Due by ${deadlineFilter.toLocaleDateString()}`);
    }
    return filters;
  }, [
    projectFilter,
    statusFilter,
    priorityFilter,
    typeFilter,
    categoryFilter,
    deadlineFilter,
    adminProjects,
  ]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div
        className="flex flex-col gap-4 sm:gap-6 md:gap-8 p-3 sm:p-4 md:p-6 lg:p-8 pb-10"
        style={{ backgroundColor: '#FAFAFA' }}
      >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">All Tasks</h1>
                <p className="mt-1 text-xs sm:text-sm md:text-base text-muted-foreground">
                  Manage and track all tasks across the organization.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleOpenCreateDialog}
                  className="rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto text-sm h-9 sm:h-10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Task</span>
                  <span className="sm:hidden">New</span>
                </Button>
                <TaskViewToggle view={viewMode} onViewChange={setViewMode} />
              </div>
            </div>

            <div className="shrink-0">
              <TaskStatsCards
                tasks={filteredTasks}
                completedCountOverride={completedCount}
              />
            </div>

            <div className="shrink-0">
              <TaskFilters
                searchQuery={searchQuery}
                project={projectFilter}
                status={statusFilter}
                priority={priorityFilter}
                type={typeFilter}
                estimate="All Estimates"
                category={categoryFilter}
                deadline={deadlineFilter}
                activeFilters={activeFilters}
                onSearchChange={setSearchQuery}
                onProjectChange={setProjectFilter}
                onStatusChange={setStatusFilter}
                onPriorityChange={setPriorityFilter}
                onTypeChange={setTypeFilter}
                onEstimateChange={() => {}}
                onCategoryChange={setCategoryFilter}
                onDeadlineChange={setDeadlineFilter}
                onRemoveFilter={() => {}}
                onReset={handleResetFilters}
                projects={projectsForSelect}
              />
            </div>

            <div className="w-full min-w-0">
              {viewMode === 'kanban' ? (
                <div className="h-[68vh] min-h-[420px]">
                  <TasksKanbanView
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleInlineStatusChange}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[14px] border border-secondary bg-white">
                  <TasksTableView
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleInlineStatusChange}
                    categoryEditable
                    onCategoryChange={handleInlineCategoryChange}
                    categoryUpdatingId={categoryUpdatingId}
                  />
                </div>
              )}
            </div>

        <AdminTaskDetailsPanel
          task={selectedTask}
          open={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedTask(null);
          }}
          projects={projectsForSelect}
          users={usersForSelect}
        />

        <CreateTaskDialog
          open={isCreateDialogOpen}
          data={newTaskData}
          projects={projectsForSelect}
          users={usersForSelect}
          categoryOptions={CATEGORY_OPTIONS}
          milestones={milestonesForSelect}
          isSubmitting={createTaskMutation.isPending}
          onOpenChange={(open) => {
            if (open) {
              handleOpenCreateDialog();
            } else {
              handleCloseCreateDialog();
            }
          }}
          onChange={(change) =>
            setNewTaskData((prev) => ({
              ...prev,
              ...change,
            }))
          }
          onSubmit={handleCreateTask}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminTasks;


