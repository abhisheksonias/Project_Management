import React, { useState } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { ProjectsProfitTable } from '@/features/profit/ui/ProjectsProfitTable';
import { ProjectDetailsDrawer } from '@/features/profit/ui/ProjectDetailsDrawer';
import { useProjectsProfit, useUserProjectProfit, useProjectProfit } from '@/features/profit/hooks/useProfit';
import { ProjectProfit } from '@/features/profit/services/profitService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, RefreshCw, Search } from 'lucide-react';
import { PaginationControls } from '@/shared/ui/PaginationControls';
import { exportProjectsProfitToCSV } from '@/shared/utils/csvExportProfit';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { startOfMonth, format } from 'date-fns';

const PROJECTS_PER_PAGE = 20;

const AdminProfit: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState<ProjectProfit | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects profit data
  const { data: projectsData, isLoading, refetch } = useProjectsProfit({
    page: currentPage,
    pageSize: PROJECTS_PER_PAGE,
    search: searchQuery,
    status: statusFilter,
  });

  // Fetch user profit data when a project is selected
  const { data: userProfitData = [], isLoading: isLoadingUsers } = useUserProjectProfit(
    selectedProject?.project_id || null
  );

  // Fetch full project details
  const { data: projectDetails } = useProjectProfit(selectedProject?.project_id || null);

  const handleProjectClick = (project: ProjectProfit) => {
    setSelectedProject(project);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedProject(null);
  };

  const handleExportCSV = () => {
    try {
      if (!projectsData?.data || projectsData.data.length === 0) {
        toast({
          title: 'No data to export',
          description: 'There are no projects to export',
          variant: 'destructive',
        });
        return;
      }
      exportProjectsProfitToCSV(projectsData.data);
      toast({
        title: 'Export successful',
        description: `Exported ${projectsData.data.length} project(s) to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export CSV',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['profit'] });
    refetch();
    toast({
      title: 'Refreshed',
      description: 'Profit data has been refreshed',
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const totalPages = projectsData
    ? Math.ceil(projectsData.total / PROJECTS_PER_PAGE)
    : 0;

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen bg-muted/30">
        {/* Header Section */}
        <header className="bg-card border-b border-border px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">

                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Profit Dashboard</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                View project-level and user-level profit breakdowns
              </p>
            </div>
          </div>

          {/* Top Bar with Filters */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 rounded-[14px]"
                />
              </div>

              {/* Month Selector */}
              <Select
                value={format(selectedMonth, 'yyyy-MM')}
                onValueChange={(value) => {
                  const [year, month] = value.split('-').map(Number);
                  setSelectedMonth(new Date(year, month - 1));
                }}
              >
                <SelectTrigger className="w-[180px] rounded-[14px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthStart = startOfMonth(date);
                    return (
                      <SelectItem key={format(monthStart, 'yyyy-MM')} value={format(monthStart, 'yyyy-MM')}>
                        {format(monthStart, 'MMMM yyyy')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Project Status Filters */}
              <div className="flex items-center gap-2">
                <Button
                  variant={statusFilter === 'All' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('All');
                    setCurrentPage(1);
                  }}
                  className={`rounded-full ${
                    statusFilter === 'All' ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'Active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('Active');
                    setCurrentPage(1);
                  }}
                  className={`rounded-full ${
                    statusFilter === 'Active' ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'Completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('Completed');
                    setCurrentPage(1);
                  }}
                  className={`rounded-full ${
                    statusFilter === 'Completed' ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  Completed
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="rounded-[14px]"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleExportCSV}
                className="rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!projectsData?.data || projectsData.data.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Projects Table */}
            <ProjectsProfitTable
              projects={projectsData?.data || []}
              isLoading={isLoading}
              onProjectClick={handleProjectClick}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && projectsData && projectsData.data.length === 0 && (
              <div className="mt-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'No projects found matching your search'
                    : 'No profit data available'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Project Details Drawer */}
        <ProjectDetailsDrawer
          project={projectDetails || selectedProject}
          users={userProfitData}
          isLoading={isLoadingUsers}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminProfit;

