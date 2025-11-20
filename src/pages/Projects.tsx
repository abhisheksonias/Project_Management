import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardProjects, useDashboardProjectStats } from '@/features/dashboard/hooks/useDashboardProjects';
import { useCalendarTasks } from '@/features/calendar/hooks/useCalendarTasks';
import { filterTasksByUserCategory } from '@/shared/utils/taskFilter';
import { ProjectStatsCards } from '@/features/projects/ui/ProjectStatsCards';
import { ProjectFilters } from '@/features/projects/ui/ProjectFilters';
import { ViewToggle } from '@/features/projects/ui/ViewToggle';
import { ProjectsGridView } from '@/features/projects/ui/ProjectsGridView';
import { ProjectsTableView } from '@/features/projects/ui/ProjectsTableView';
import { ProjectDetailsPanel } from '@/features/projects/ui/ProjectDetailsPanel';
import { Project } from '@/features/projects/services/projectService';
import { PaginationControls } from '@/shared/ui/PaginationControls';

const PROJECTS_PER_PAGE = 6;

const Projects: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // View mode state
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [status, setStatus] = useState<string>('All Statuses');
  const [priority, setPriority] = useState<string>('All Priorities');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selected project for side panel
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch data
  const { data: projects = [], isLoading } = useDashboardProjects(profile?.id || '');
  const { data: stats } = useDashboardProjectStats(profile?.id || '');
  const { data: allTasks = [] } = useCalendarTasks();

  // Apply task filtering
  const tasks = useMemo(() => {
    return filterTasksByUserCategory(allTasks, profile);
  }, [allTasks, profile]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Exclude completed and on hold projects
      const projectStatus = (project.status || '').toLowerCase();
      if (projectStatus === 'completed' || projectStatus === 'on hold') {
        return false;
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
    return tasks.filter((task) => task.project_id === selectedProject.id);
  }, [tasks, selectedProject]);

  // Update selected project when projects data changes (e.g., after adding comment)
  useEffect(() => {
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
    } else if (tab === 'settings') {
      navigate('/user/profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-white">
        <UserSidebar currentTab="projects" onTabChange={handleSidebarNavigation} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <UserSidebar currentTab="projects" onTabChange={handleSidebarNavigation} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Projects</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage all your projects in one place.
              </p>
            </div>
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
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
            />
          ) : (
            <ProjectsTableView
              projects={paginatedProjects}
              onProjectClick={handleProjectClick}
            />
          )}

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Project Details Side Panel */}
      <ProjectDetailsPanel
        project={selectedProject}
        tasks={selectedProjectTasks}
        open={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedProject(null);
        }}
      />
    </div>
  );
};

export default Projects;

