import React, { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useAdminProjects, useAdminProjectStats } from '@/features/admin/hooks/useAdminProjects';
import { ProjectStatsCards } from '@/features/projects/ui/ProjectStatsCards';
import { ProjectFilters } from '@/features/projects/ui/ProjectFilters';
import { ViewToggle } from '@/features/projects/ui/ViewToggle';
import { ProjectsGridView } from '@/features/projects/ui/ProjectsGridView';
import { ProjectsTableView } from '@/features/projects/ui/ProjectsTableView';
import { AdminProjectDetailsPanel } from '@/features/admin/ui/AdminProjectDetailsPanel';
import { Project } from '@/features/projects/services/projectService';
import { useAdminTasks } from '@/features/admin/hooks/useAdminTasks';
import {
  useUpdateProject,
  useCreateProject,
} from '@/features/admin/hooks/useAdminProjectMutations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  CreateProjectDialog,
  NewProjectFormState,
  createDefaultNewProjectFormState,
} from '@/features/admin/ui/CreateProjectDialog';
import { PaginationControls } from '@/shared/ui/PaginationControls';

const PROJECT_CATEGORY_OPTIONS = [
  { value: 'One-time', label: 'One-time' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Hourly', label: 'Hourly' },
];

const PROJECTS_PER_PAGE = 6;

const AdminProjects: React.FC = () => {
  // View mode state
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [status, setStatus] = useState<string>('All Statuses');
  const [priority, setPriority] = useState<string>('All Priorities');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected project for side panel
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch data
  const { profile } = useAuth();
  const { data: projects = [], isLoading } = useAdminProjects();
  const { data: stats } = useAdminProjectStats();
  const { data: allTasks = [] } = useAdminTasks();
  const updateProjectMutation = useUpdateProject();
  const createProjectMutation = useCreateProject();

  const [newProjectData, setNewProjectData] = useState<NewProjectFormState>(() =>
    createDefaultNewProjectFormState()
  );

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Exclude completed projects by default (unless status filter is "Completed")
      if (status === 'All Statuses') {
        const projectStatus = project.status?.toLowerCase() || '';
        if (projectStatus === 'completed') {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!project.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (status !== 'All Statuses') {
        const projectStatus = project.status?.toLowerCase() || '';
        const filterStatus = status.toLowerCase();
        if (projectStatus !== filterStatus) {
          return false;
        }
      }

      // Priority filter
      if (priority !== 'All Priorities' && project.priority !== priority) {
        return false;
      }

      // Deadline filter - show projects between today and selected date
      if (deadline) {
        if (!project.deadline) {
          return false;
        }

        const projectDeadline = new Date(project.deadline);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const selectedStart = new Date(deadline);
        selectedStart.setHours(0, 0, 0, 0);
        const selectedEnd = new Date(deadline);
        selectedEnd.setHours(23, 59, 59, 999);

        const rangeStart =
          todayStart.getTime() < selectedStart.getTime() ? todayStart : selectedStart;
        const rangeEnd =
          todayEnd.getTime() > selectedEnd.getTime() ? todayEnd : selectedEnd;

        if (
          projectDeadline.getTime() < rangeStart.getTime() ||
          projectDeadline.getTime() > rangeEnd.getTime()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [projects, searchQuery, status, priority, deadline]);

  const filteredCount = filteredProjects.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PROJECTS_PER_PAGE));

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
    return filteredProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, status, priority, deadline]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCount / PROJECTS_PER_PAGE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredCount, currentPage]);

  // Get tasks for selected project
  const selectedProjectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return allTasks.filter((task) => task.project_id === selectedProject.id);
  }, [allTasks, selectedProject]);

  const handleInlineStatusChange = (projectId: string, newStatus: string) => {
    const normalizedStatus = newStatus === 'none' ? '' : newStatus;
    const project = projects.find((p) => p.id === projectId);
    if ((project?.status || '') === (normalizedStatus || '')) {
      return;
    }
    updateProjectMutation.mutate({
      projectId,
      data: { status: normalizedStatus || null },
    });
  };

  const handleInlinePriorityChange = (projectId: string, newPriority: string) => {
    const normalizedPriority = newPriority === 'none' ? '' : newPriority;
    const project = projects.find((p) => p.id === projectId);
    if ((project?.priority || '') === (normalizedPriority || '')) {
      return;
    }
    updateProjectMutation.mutate({
      projectId,
      data: { priority: normalizedPriority || null },
    });
  };

  const handleCreateProject = () => {
    const trimmedName = newProjectData.name.trim();
    const trimmedType = newProjectData.type.trim();

    if (!trimmedName || !trimmedType) {
      return;
    }

    createProjectMutation.mutate(
      {
        name: trimmedName,
        description: newProjectData.description.trim() || null,
        status: newProjectData.status || null,
        type: trimmedType,
        priority: newProjectData.priority || null,
        deadline: newProjectData.deadline ? newProjectData.deadline.toISOString() : null,
        category: newProjectData.category || null,
        reference: newProjectData.reference || null,
        admin_id: profile?.id || null,
      },
      {
        onSuccess: () => {
          handleCloseCreateDialog();
        },
      }
    );
  };
  // Update selected project when projects data changes
  React.useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const updatedProject = projects.find((p) => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
    }
  }, [projects, selectedProject?.id]);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsPanelOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatus('All Statuses');
    setPriority('All Priorities');
    setDeadline(undefined);
  };

  const resetNewProjectForm = () => {
    setNewProjectData(createDefaultNewProjectFormState());
  };

  const handleOpenCreateDialog = () => {
    resetNewProjectForm();
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    resetNewProjectForm();
    setIsCreateDialogOpen(false);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-6 sm:space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">All Projects</h1>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Manage and track all projects in the system.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleOpenCreateDialog}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                  <ViewToggle view={viewMode} onViewChange={setViewMode} />
                </div>
              </div>

              {/* Stats Cards */}
              {stats && <ProjectStatsCards stats={stats} />}

              {/* Filters */}
              <ProjectFilters
                searchQuery={searchQuery}
                status={status}
                priority={priority}
                deadline={deadline}
                onSearchChange={setSearchQuery}
                onStatusChange={setStatus}
                onPriorityChange={setPriority}
                onDeadlineChange={setDeadline}
                onReset={handleResetFilters}
              />

              {/* Projects List */}
              {viewMode === 'card' ? (
                <ProjectsGridView
                  projects={paginatedProjects}
                  onProjectClick={handleProjectClick}
                  showCategory
                  onStatusChange={handleInlineStatusChange}
                  onPriorityChange={handleInlinePriorityChange}
                />
              ) : (
                <ProjectsTableView
                  projects={paginatedProjects}
                  onProjectClick={handleProjectClick}
                  showCategory
                  onStatusChange={handleInlineStatusChange}
                  onPriorityChange={handleInlinePriorityChange}
                />
              )}

              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>

        {/* Project Details Side Panel - Editable */}
        <AdminProjectDetailsPanel
          project={selectedProject}
          tasks={selectedProjectTasks}
          open={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedProject(null);
          }}
        />

        <CreateProjectDialog
          open={isCreateDialogOpen}
          data={newProjectData}
          categoryOptions={PROJECT_CATEGORY_OPTIONS}
          isSubmitting={createProjectMutation.isPending}
          onOpenChange={(open) => {
            if (open) {
              handleOpenCreateDialog();
            } else {
              handleCloseCreateDialog();
            }
          }}
          onChange={(changes) =>
            setNewProjectData((prev) => ({
              ...prev,
              ...changes,
            }))
          }
          onSubmit={handleCreateProject}
        />

      </div>
    </AdminLayout>
  );
};

export default AdminProjects;

