import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { EfficiencyMetricsCards } from '@/features/efficiency/ui/EfficiencyMetricsCards';
import { UserProfileCard } from '@/features/efficiency/ui/UserProfileCard';
import { DailyHoursChart } from '@/features/efficiency/ui/DailyHoursChart';
import { HoursByProjectChart } from '@/features/efficiency/ui/HoursByProjectChart';
import {
  useEfficiencyStats,
  useDailyHours,
  useHoursByProject,
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
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Users, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subDays, format } from 'date-fns';
import { DateRangeOption } from '@/features/admin/services/adminService';
import { cn } from '@/lib/utils';

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

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const dateRangeOptions: Array<{ value: DateRangeOption; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'this-year', label: 'This Year' },
  ];

  const selectedDateRangeLabel = dateRangeOptions.find(opt => opt.value === dateRange)?.label || 'Custom Range';

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen bg-muted/30">
        {/* Header Section */}
        <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Efficiency Overview</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base ml-4">
                Review team and individual user efficiency based on worklogs and performance metrics.
              </p>
            </div>
            <div className="flex flex-col gap-3 items-start sm:flex-row sm:items-end">
              {/* Date Range Filter */}
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-[14px] border border-border/50">
                <Calendar className="h-4 w-4 text-primary" />
                <div className="relative">
                  <Select
                    value={dateRange === 'custom' ? 'custom' : dateRange}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setIsDatePickerOpen(true);
                        handleDateRangeChange('custom');
                      } else {
                        handleDateRangeChange(value as DateRangeOption);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 w-[180px] rounded-[14px] border-2 hover:border-primary/50 transition-colors">
                      {dateRange === 'custom' && tempStartDate && tempEndDate ? (
                        <span className="text-sm font-medium">
                          {format(tempStartDate, 'MMM d')} - {format(tempEndDate, 'MMM d')}
                        </span>
                      ) : (
                        <SelectValue placeholder="Select date range" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {dateRangeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dateRange === 'custom' && (
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'rounded-[14px] h-9 text-sm border',
                          'border-primary text-primary bg-primary/5'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {tempStartDate && tempEndDate
                          ? `${format(tempStartDate, 'MMM d')} - ${format(tempEndDate, 'MMM d')}`
                          : 'Select Dates'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={currentMonth}
                        selected={{
                          from: tempStartDate,
                          to: tempEndDate,
                        }}
                        onSelect={(range) => {
                          if (range?.from === undefined && range?.to === undefined) {
                            setTempStartDate(undefined);
                            setTempEndDate(undefined);
                          } else {
                            setTempStartDate(range?.from);
                            setTempEndDate(range?.to);
                          }
                        }}
                        numberOfMonths={2}
                      />
                      {(tempStartDate || tempEndDate) && (
                        <div className="border-t p-3 flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleResetDateRange}
                          >
                            Reset
                          </Button>
                          <Button
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={handleConfirmDateRange}
                            disabled={!tempStartDate || !tempEndDate}
                          >
                            Apply
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* User Filter */}
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-[14px] border border-border/50">
                <Users className="h-4 w-4 text-primary" />
                <Select
                  value={selectedUserId || 'all'}
                  onValueChange={(value) => setSelectedUserId(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="h-9 w-[180px] rounded-[14px] border-2 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
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
              {selectedUserId && selectedUser && (
                <UserProfileCard
                  user={selectedUser}
                  isLoading={false}
                />
              )}

              {/* Charts - Separate Rows */}
              <div className="space-y-6 sm:space-y-8">
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
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEfficiency;

