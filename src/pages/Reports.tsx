import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { ReportFilters } from '@/features/reports/ui/ReportFilters';
import { ReportStatsCards } from '@/features/reports/ui/ReportStatsCards';
import { HoursOverTimeChart } from '@/features/reports/ui/HoursOverTimeChart';
import { HoursByProjectChart } from '@/features/reports/ui/HoursByProjectChart';
import { EstimateVsLoggedTable } from '@/features/reports/ui/EstimateVsLoggedTable';
import { InsightsCard } from '@/features/reports/ui/InsightsCard';
import { useReportData, getDefaultFilters } from '@/features/reports/hooks/useReportData';
import { useDashboardProjects } from '@/features/dashboard/hooks/useDashboardProjects';
import { ReportFilters as ReportFiltersType } from '@/features/reports/services/reportService';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const normalizeFilterDates = (input: ReportFiltersType): ReportFiltersType => {
  const now = new Date();

  const toValidDate = (value?: Date | string | null): Date | null => {
    if (!value) return null;
    try {
      const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  };

  let start = toValidDate(input.startDate);
  let end = toValidDate(input.endDate);

  // If we have one date but not the other, derive the missing one
  if (!start && end) {
    start = startOfMonth(end);
  }
  if (!end && start) {
    end = endOfMonth(start);
  }

  // If both are missing, use current month
  if (!start) {
    start = startOfMonth(now);
  }
  if (!end) {
    end = endOfMonth(now);
  }

  // Ensure start is before end
  if (start.getTime() > end.getTime()) {
    const temp = start;
    start = end;
    end = temp;
  }

  // Ensure dates are valid Date objects
  const normalizedStart = new Date(start.getTime());
  const normalizedEnd = new Date(end.getTime());

  return {
    ...input,
    startDate: normalizedStart,
    endDate: normalizedEnd,
  };
};

const Reports: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFiltersType>(normalizeFilterDates(getDefaultFilters()));
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(undefined);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRangeOption, setDateRangeOption] = useState<'this-month' | 'last-month' | 'custom'>('this-month');

  const userId = profile?.id || '';
  const { data: projects = [] } = useDashboardProjects(userId);
  const { data: reportData, isLoading, error } = useReportData(userId, filters);

  // Sort projects in ascending order - MUST be called before any early returns
  const sortedProjects = React.useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

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

  const handleFiltersChange = (update: Partial<ReportFiltersType>) => {
    setFilters((prev) => {
      try {
        const merged = { ...prev, ...update };
        return normalizeFilterDates(merged);
      } catch (error) {
        console.error('Error updating filters:', error);
        // Return previous filters if update fails
        return prev;
      }
    });
  };

  const handleDateRangeSelect = (range: 'this-month' | 'last-month' | 'custom') => {
    const now = new Date();
    setDateRangeOption(range);
    
    if (range === 'this-month') {
      handleFiltersChange({
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      });
      setIsDatePickerOpen(false);
    } else if (range === 'last-month') {
      const lastMonth = subMonths(now, 1);
      handleFiltersChange({
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      });
      setIsDatePickerOpen(false);
    } else if (range === 'custom') {
      // Initialize with current filter dates if available, otherwise use current month
      const startDate = filters.startDate || startOfMonth(now);
      const endDate = filters.endDate || endOfMonth(now);
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      // Only open popover if dates are not already set
      if (!filters.startDate || !filters.endDate) {
        setIsDatePickerOpen(true);
      }
    }
  };

  const handleConfirmDateRange = () => {
    if (tempStartDate && tempEndDate) {
      // Ensure dates are at start/end of day for proper filtering
      const start = new Date(tempStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tempEndDate);
      end.setHours(23, 59, 59, 999);
      
      handleFiltersChange({
        startDate: start,
        endDate: end,
      });
      // Update temp dates to match confirmed dates
      setTempStartDate(start);
      setTempEndDate(end);
      // Keep dateRangeOption as 'custom' after confirmation
      setDateRangeOption('custom');
      setIsDatePickerOpen(false);
    }
  };

  const handleResetDateRange = () => {
    const now = new Date();
    setTempStartDate(startOfMonth(now));
    setTempEndDate(endOfMonth(now));
    setDateRangeOption('this-month');
    setIsDatePickerOpen(false);
  };


  if (!profile) {
    return (
      <div className="flex h-screen mt-16 sm:mt-0">
        <UserSidebar currentTab="reports" onTabChange={handleSidebarNavigation} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm sm:text-base text-muted-foreground">Please log in to view reports</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen mt-16 sm:mt-0">
        <UserSidebar currentTab="reports" onTabChange={handleSidebarNavigation} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen mt-16 sm:mt-0">
        <UserSidebar currentTab="reports" onTabChange={handleSidebarNavigation} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm sm:text-base text-destructive mb-2">Error loading reports</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen mt-16 sm:mt-0" style={{ backgroundColor: '#FAFAFA' }}>
      <UserSidebar currentTab="reports" onTabChange={handleSidebarNavigation} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 w-full">
          {/* Header */}
          <div className="mb-3 sm:mb-4 md:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 sm:mb-3">
              My Reports
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 hidden sm:block">
              Track your work hours and project performance
            </p>
            <ReportFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              projects={sortedProjects.map((p) => ({ id: p.id, name: p.name }))}
              onDateRangeSelect={handleDateRangeSelect}
              tempStartDate={tempStartDate}
              tempEndDate={tempEndDate}
              onTempDateChange={({ from, to }) => {
                setTempStartDate(from);
                setTempEndDate(to);
              }}
              onConfirmDateRange={handleConfirmDateRange}
              onResetDateRange={handleResetDateRange}
              isDatePickerOpen={isDatePickerOpen}
              onDatePickerOpenChange={setIsDatePickerOpen}
              dateRangeOption={dateRangeOption}
            />
          </div>

          {/* Stats Cards */}
          {reportData?.stats && (
            <div className="mb-3 sm:mb-4 md:mb-6">
              <ReportStatsCards stats={reportData.stats} />
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-6">
            {reportData?.hoursOverTime && (
              <HoursOverTimeChart data={reportData.hoursOverTime} />
            )}
            {reportData?.hoursByProject && (
              <HoursByProjectChart data={reportData.hoursByProject} />
            )}
          </div>

          {/* Table and Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {reportData?.estimateVsLogged && (
              <div className="lg:col-span-2 order-2 lg:order-1">
                <EstimateVsLoggedTable data={reportData.estimateVsLogged} />
              </div>
            )}
            {reportData?.insights && (
              <div className="lg:col-span-1 order-1 lg:order-2">
                <InsightsCard insights={reportData.insights} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

