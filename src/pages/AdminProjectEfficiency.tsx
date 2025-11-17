import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { AdminDateRangeFilters } from '@/features/admin/ui/AdminDateRangeFilters';
import { ProjectEfficiencyMetricsCards } from '@/features/projectEfficiency/ui/ProjectEfficiencyMetricsCards';
import { ProjectInfoCard } from '@/features/projectEfficiency/ui/ProjectInfoCard';
import { ProjectDailyHoursChart } from '@/features/projectEfficiency/ui/ProjectDailyHoursChart';
import { HoursByUserChart } from '@/features/projectEfficiency/ui/HoursByUserChart';
import { ProjectRecentWorklogsTable } from '@/features/projectEfficiency/ui/ProjectRecentWorklogsTable';
import {
  useProjectEfficiencyStats,
  useProjectDailyHours,
  useHoursByUser,
  useProjectRecentWorklogs,
} from '@/features/projectEfficiency/hooks/useProjectEfficiency';
import { useAdminProjects } from '@/features/admin/hooks/useAdminProjects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subDays } from 'date-fns';
import { DateRangeOption } from '@/features/admin/services/adminService';

const AdminProjectEfficiency: React.FC = () => {
  const currentMonth = new Date();
  const [dateRange, setDateRange] = useState<DateRangeOption>('last-30-days');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch all projects
  const { data: projects = [] } = useAdminProjects();

  // Calculate date range based on selection
  useEffect(() => {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    if (dateRange === 'custom') {
      // For custom range, only set dates if they're explicitly selected
      if (tempStartDate && tempEndDate) {
        start = tempStartDate;
        end = tempEndDate;
      }
      // If custom but no dates yet, leave undefined (service will use dateRange)
    } else {
      // For predefined ranges, calculate dates
      switch (dateRange) {
        case 'today':
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case 'this-week':
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'last-month':
          const lastMonth = subMonths(now, 1);
          start = startOfMonth(lastMonth);
          end = endOfMonth(lastMonth);
          break;
        case 'last-30-days':
          start = subDays(now, 30);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case 'this-month':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'this-quarter':
          start = startOfQuarter(now);
          end = endOfQuarter(now);
          break;
        case 'this-year':
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        default:
          start = subDays(now, 30);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
      }
    }

    setStartDate(start);
    setEndDate(end);
  }, [dateRange, tempStartDate, tempEndDate]);

  const handleDateRangeChange = (range: DateRangeOption) => {
    setDateRange(range);
    if (range !== 'custom') {
      setIsDatePickerOpen(false);
    }
  };

  const handleConfirmDateRange = () => {
    if (tempStartDate && tempEndDate) {
      // Set dates first, then update dateRange to trigger useEffect
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
      setDateRange('custom');
      setIsDatePickerOpen(false);
    }
  };

  const handleResetDateRange = () => {
    setTempStartDate(subDays(new Date(), 30));
    setTempEndDate(new Date());
  };

  // Fetch project efficiency data
  const { data: stats, isLoading: isLoadingStats } = useProjectEfficiencyStats(
    selectedProjectId,
    dateRange,
    startDate && endDate ? startDate : undefined,
    startDate && endDate ? endDate : undefined
  );

  const { data: dailyHours, isLoading: isLoadingDailyHours } = useProjectDailyHours(
    selectedProjectId,
    dateRange,
    startDate && endDate ? startDate : undefined,
    startDate && endDate ? endDate : undefined
  );

  const { data: hoursByUser, isLoading: isLoadingHoursByUser } = useHoursByUser(
    selectedProjectId,
    dateRange,
    startDate && endDate ? startDate : undefined,
    startDate && endDate ? endDate : undefined
  );

  const { data: recentWorklogs, isLoading: isLoadingRecentWorklogs } = useProjectRecentWorklogs(
    selectedProjectId,
    10
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        {/* Header Section */}
        <header className="bg-white border-b border-secondary/30 px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Project Efficiency Overview</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Review project efficiency and team performance based on worklogs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap items-center gap-2">
                  <AdminDateRangeFilters
                    dateRange={dateRange}
                    onDateRangeChange={handleDateRangeChange}
                    tempStartDate={tempStartDate}
                    tempEndDate={tempEndDate}
                    onTempDateChange={(range) => {
                      setTempStartDate(range.from);
                      setTempEndDate(range.to);
                    }}
                    onConfirmDateRange={handleConfirmDateRange}
                    onResetDateRange={handleResetDateRange}
                    isDatePickerOpen={isDatePickerOpen}
                    onDatePickerOpenChange={setIsDatePickerOpen}
                    currentMonth={currentMonth}
                  />
                </div>
              </div>

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

                {/* Recent Worklogs Table */}
                {selectedProjectId && (
                  <ProjectRecentWorklogsTable
                    worklogs={recentWorklogs}
                    isLoading={isLoadingRecentWorklogs}
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

