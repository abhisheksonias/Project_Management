import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { AdminDateRangeFilters } from '@/features/admin/ui/AdminDateRangeFilters';
import { EfficiencyMetricsCards } from '@/features/efficiency/ui/EfficiencyMetricsCards';
import { UserProfileCard } from '@/features/efficiency/ui/UserProfileCard';
import { DailyHoursChart } from '@/features/efficiency/ui/DailyHoursChart';
import { HoursByProjectChart } from '@/features/efficiency/ui/HoursByProjectChart';
import { RecentWorklogsTable } from '@/features/efficiency/ui/RecentWorklogsTable';
import {
  useEfficiencyStats,
  useDailyHours,
  useHoursByProject,
  useRecentWorklogs,
} from '@/features/efficiency/hooks/useEfficiency';
import { userService } from '@/features/users/services/userService';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subDays } from 'date-fns';
import { DateRangeOption } from '@/features/admin/services/adminService';

const AdminEfficiency: React.FC = () => {
  const currentMonth = new Date();
  const [dateRange, setDateRange] = useState<DateRangeOption>('last-30-days');
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch all users (excluding admin)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userService.getAllUsers(),
    staleTime: 300000,
  });

  const users = allUsers.filter((user) => user.role !== 'admin' && user.role !== 'Admin');

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

  // Fetch efficiency data - pass dates only when they're calculated
  const { data: stats, isLoading: isLoadingStats } = useEfficiencyStats(
    selectedUserId,
    dateRange,
    startDate && endDate ? startDate : undefined,
    startDate && endDate ? endDate : undefined
  );

  const { data: dailyHours, isLoading: isLoadingDailyHours } = useDailyHours(
    selectedUserId,
    dateRange,
    startDate && endDate ? startDate : undefined,
    startDate && endDate ? endDate : undefined,
    !!selectedUserId
  );

  const { data: hoursByProject, isLoading: isLoadingHoursByProject } = useHoursByProject(
    selectedUserId,
    dateRange,
    startDate && endDate ? startDate : undefined,
    startDate && endDate ? endDate : undefined
  );

  const { data: recentWorklogs, isLoading: isLoadingRecentWorklogs } = useRecentWorklogs(
    selectedUserId,
    10,
    !!selectedUserId
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        {/* Header Section */}
        <header className="bg-white border-b border-secondary/30 px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Efficiency Overview</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Review team and individual user efficiency based on worklogs.
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

              {/* User Filter */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedUserId || 'all'}
                  onValueChange={(value) => setSelectedUserId(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="w-[180px] rounded-[14px] h-9">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
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
            <div className="space-y-6 sm:space-y-8">
              {/* Key Metrics Cards */}
              <EfficiencyMetricsCards stats={stats} isLoading={isLoadingStats} />

              {/* User Profile Card (only when user selected) */}
              {selectedUserId && (
                <UserProfileCard
                  user={selectedUser}
                  isLoading={false}
                />
              )}

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                {/* Daily Hours Chart (only when user selected) */}
                {selectedUserId && (
                  <DailyHoursChart
                    data={dailyHours}
                    isLoading={isLoadingDailyHours}
                  />
                )}

                {/* Hours by Project Chart */}
                <HoursByProjectChart
                  data={hoursByProject}
                  isLoading={isLoadingHoursByProject}
                />
              </div>

              {/* Recent Worklogs Table (only when user selected) */}
              {selectedUserId && (
                <RecentWorklogsTable
                  worklogs={recentWorklogs}
                  isLoading={isLoadingRecentWorklogs}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEfficiency;

