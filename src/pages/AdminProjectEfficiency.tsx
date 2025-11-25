import React, { useState } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { ProjectEfficiencyMetricsCards } from '@/features/projectEfficiency/ui/ProjectEfficiencyMetricsCards';
import { ProjectInfoCard } from '@/features/projectEfficiency/ui/ProjectInfoCard';
import { ProjectDailyHoursChart } from '@/features/projectEfficiency/ui/ProjectDailyHoursChart';
import { HoursByUserChart } from '@/features/projectEfficiency/ui/HoursByUserChart';
import { HoursByTaskTable } from '@/features/projectEfficiency/ui/HoursByTaskTable';
import {
  useProjectEfficiencyStats,
  useProjectDailyHours,
  useHoursByUser,
  useHoursByTask,
} from '@/features/projectEfficiency/hooks/useProjectEfficiency';
import { useAdminProjects } from '@/features/admin/hooks/useAdminProjects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen } from 'lucide-react';

const AdminProjectEfficiency: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  // Fetch all projects
  const { data: projects = [] } = useAdminProjects();

  // Fetch project efficiency data (all-time, no date filters)
  const { data: stats, isLoading: isLoadingStats } = useProjectEfficiencyStats(
    selectedProjectId
  );

  const { data: dailyHours, isLoading: isLoadingDailyHours } = useProjectDailyHours(
    selectedProjectId
  );

  const { data: hoursByUser, isLoading: isLoadingHoursByUser } = useHoursByUser(
    selectedProjectId
  );

  const { data: hoursByTask, isLoading: isLoadingHoursByTask } = useHoursByTask(
    selectedProjectId
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen bg-muted/30">
        {/* Header Section */}
        <header className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Project Efficiency Overview</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Review project efficiency and team performance based on worklogs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {/* Project Filter */}
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedProjectId || 'all'}
                  onValueChange={(value) => setSelectedProjectId(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="w-[200px] rounded-[14px] h-9">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {!selectedProjectId ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-semibold text-muted-foreground">Select a project to view efficiency</p>
                  <p className="text-sm text-muted-foreground mt-2">Choose a project from the dropdown above</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {/* Key Metrics Cards */}
                <ProjectEfficiencyMetricsCards stats={stats} isLoading={isLoadingStats} />

                {/* Project Info Card */}
                {selectedProjectId && (
                  <ProjectInfoCard
                    project={selectedProject}
                    isLoading={false}
                  />
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  {/* Daily Hours Chart */}
                  {selectedProjectId && (
                    <ProjectDailyHoursChart
                      data={dailyHours}
                      isLoading={isLoadingDailyHours}
                    />
                  )}

                  {/* Hours by User Chart */}
                  {selectedProjectId && (
                    <HoursByUserChart
                      data={hoursByUser}
                      isLoading={isLoadingHoursByUser}
                    />
                  )}
                </div>

                {/* Hours by Task */}
                {selectedProjectId && (
                  <HoursByTaskTable
                    data={hoursByTask}
                    isLoading={isLoadingHoursByTask}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProjectEfficiency;

