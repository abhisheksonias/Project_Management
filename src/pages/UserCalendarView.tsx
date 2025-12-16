import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useUserLeaves, useUserWorklogsForMonth, useUserMonthStats, useAllUsers } from '@/features/admin/hooks/useUserManagement';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, getDaysInMonth, parse, subMonths, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

const parseMonth = (value: string | null) => {
  if (!value) return startOfMonth(new Date());
  return startOfMonth(parse(`${value}-01`, 'yyyy-MM-dd', new Date()));
};

const buildCalendarDays = (month: Date) => {
  const firstDay = startOfMonth(month).getDay();
  const daysInMonth = getDaysInMonth(month);
  const cells: Array<Date | null> = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const UserCalendarView: React.FC = () => {
  const { userId: initialUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || '');
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch all users for dropdown
  const { data: allUsers = [] } = useAllUsers();

  const { data: leaves = [], isLoading: isLoadingLeaves } = useUserLeaves(
    selectedUserId || null,
    selectedMonth
  );

  const { data: worklogs = [], isLoading: isLoadingWorklogs } = useUserWorklogsForMonth(
    selectedUserId || null,
    selectedMonth
  );

  const { data: monthStats, isLoading: isLoadingStats } = useUserMonthStats(
    selectedUserId || null,
    selectedMonth
  );

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);

  // Create maps for quick lookup
  const leavesMap = useMemo(() => {
    const map = new Map<string, any>();
    leaves.forEach((leave) => {
      map.set(leave.leave_date, leave);
    });
    return map;
  }, [leaves]);

  const worklogsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    worklogs.forEach((log: any) => {
      const date = format(new Date(log.created_at), 'yyyy-MM-dd');
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(log);
    });
    return map;
  }, [worklogs]);

  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);

  const handleDateClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setIsDetailsOpen(true);
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const selectedDateLeaves = selectedDate ? leavesMap.get(dayKey(selectedDate)) : null;
  const selectedDateWorklogs = selectedDate ? worklogsMap.get(dayKey(selectedDate)) || [] : [];

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatHours = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return '—';
    return `${hours.toFixed(2)}h`;
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen mt-16 sm:mt-0 bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
        {/* Header */}
        <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm px-3 sm:px-4 py-4 sm:py-5 lg:px-6">
          <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5">
            {/* Top Row: Back button and Title */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/users')}
                className="rounded-[14px] h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-6 sm:h-8 w-1 rounded-full bg-primary" />
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">User Calendar View</h1>
              </div>
            </div>

            {/* Second Row: User Dropdown and Month Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">User:</span>
                <Select
                  value={selectedUserId}
                  onValueChange={(value) => {
                    setSelectedUserId(value);
                    navigate(`/admin/users/${value}/calendar`, { replace: true });
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[220px] rounded-[14px] h-9 sm:h-10 border-2 hover:border-primary/50 transition-colors text-sm">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-[14px] border border-border/50 w-full sm:w-auto justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="rounded-[14px] h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <h2 className="text-sm sm:text-base lg:text-lg font-bold min-w-[120px] sm:min-w-[160px] text-center text-foreground">
                  {format(selectedMonth, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="rounded-[14px] h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {/* Third Row: Month Stats - Enhanced Cards */}
            {monthStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Card className="p-2 sm:p-3 rounded-[14px] border-2 bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Salary</span>
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-foreground break-words">{formatCurrency(monthStats.monthly_salary)}</span>
                  </div>
                </Card>
                <Card className="p-2 sm:p-3 rounded-[14px] border-2 bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Salary</span>
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-primary break-words">{formatCurrency(monthStats.net_salary)}</span>
                  </div>
                </Card>
                <Card className="p-2 sm:p-3 rounded-[14px] border-2 bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Hours</span>
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-foreground">{formatHours(monthStats.total_hours)}</span>
                  </div>
                </Card>
                <Card className="p-2 sm:p-3 rounded-[14px] border-2 bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Unpaid Leaves</span>
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-destructive">{monthStats.unpaid_leaves}</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="flex-1 p-2 sm:p-4 lg:p-6 overflow-hidden min-h-0">
          <div className="h-full flex flex-col gap-2 sm:gap-4">
            <Card className="p-2 sm:p-4 rounded-[14px] h-full flex flex-col min-h-0 shadow-lg border-2 bg-card/95 backdrop-blur-sm">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2 flex-shrink-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-[10px] sm:text-xs lg:text-sm font-bold text-muted-foreground py-1 sm:py-2 bg-muted/50 rounded-[6px] sm:rounded-[8px]">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 min-h-0" style={{ gridAutoRows: '1fr' }}>
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="rounded-[8px]" />;
                  }

                  const dateKey = dayKey(date);
                  const leave = leavesMap.get(dateKey);
                  const dayWorklogs = worklogsMap.get(dateKey) || [];
                  const totalHours = dayWorklogs.reduce((sum, log: any) => sum + (log.hours_num || 0), 0);
                  const isToday = dayKey(date) === dayKey(new Date());
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <button
                      key={dateKey}
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        'rounded-[6px] sm:rounded-[10px] border-2 p-1 sm:p-2 lg:p-2.5 text-left transition-all duration-200 flex flex-col justify-between min-h-0 h-full',
                        'hover:scale-[1.02] hover:shadow-md hover:z-10 relative',
                        isToday && 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20',
                        !isToday && !leave && 'border-border/50 bg-card hover:bg-muted/50',
                        isWeekend && !isToday && !leave && 'bg-muted/30',
                        leave && !leave.is_paid && leave.leave_type === 'full' && 'bg-red-50 border-red-400 shadow-sm hover:bg-red-100',
                        leave && !leave.is_paid && leave.leave_type === 'half' && 'bg-orange-50 border-orange-400 shadow-sm hover:bg-orange-100',
                        leave && leave.is_paid && 'bg-green-50 border-green-400 shadow-sm hover:bg-green-100'
                      )}
                    >
                      <div className="flex items-center justify-between flex-shrink-0">
                        <span className={cn(
                          'text-xs sm:text-sm lg:text-base font-bold',
                          isToday && 'text-primary',
                          !isToday && isWeekend && 'text-muted-foreground',
                          !isToday && !isWeekend && 'text-foreground'
                        )}>
                          {format(date, 'd')}
                        </span>
                        {leave && (
                          <span className={cn(
                            'text-[10px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded-full',
                            leave.leave_type === 'half' && 'bg-orange-200 text-orange-800',
                            leave.leave_type === 'full' && leave.is_paid && 'bg-green-200 text-green-800',
                            leave.leave_type === 'full' && !leave.is_paid && 'bg-red-200 text-red-800'
                          )}>
                            {leave.leave_type === 'half' ? '½' : 'L'}
                          </span>
                        )}
                      </div>
                      {totalHours > 0 && (
                        <div className="flex items-center gap-1 sm:gap-1.5 mt-auto flex-shrink-0 bg-primary/10 px-1 sm:px-2 py-0.5 sm:py-1 rounded-[4px] sm:rounded-[6px]">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-3.5 lg:w-3.5 text-primary" />
                          <span className="text-[10px] sm:text-xs font-semibold text-primary">{totalHours.toFixed(1)}h</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Legend - Enhanced */}
            <Card className="p-2 sm:p-4 rounded-[14px] border-2 bg-card/95 backdrop-blur-sm shadow-sm flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] sm:rounded-[6px] border-2 border-red-400 bg-red-50 shadow-sm" />
                  <span className="font-medium text-foreground">Unpaid Full Day</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] sm:rounded-[6px] border-2 border-orange-400 bg-orange-50 shadow-sm" />
                  <span className="font-medium text-foreground">Unpaid Half Day</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] sm:rounded-[6px] border-2 border-green-400 bg-green-50 shadow-sm" />
                  <span className="font-medium text-foreground">Paid Leave</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[4px] sm:rounded-[6px] border-2 border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20" />
                  <span className="font-medium text-foreground">Today</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Day Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[550px] max-h-[90vh] rounded-[14px] border-2 shadow-xl overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-3 sm:pb-4 border-b border-border/50">
              <DialogTitle className="text-base sm:text-lg lg:text-xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="break-words">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Day Details'}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              {/* Leave Info */}
              {selectedDateLeaves && (
                <Card className="p-3 sm:p-4 rounded-[14px] border-2 bg-gradient-to-br from-card to-muted/30 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      selectedDateLeaves.is_paid ? 'bg-green-500' : 'bg-red-500'
                    )} />
                    <h3 className="font-bold text-sm sm:text-base text-foreground">Leave Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        {selectedDateLeaves.leave_type === 'half' ? 'Half Day' : 'Full Day'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                      <span className={cn(
                        'text-xs sm:text-sm font-bold',
                        selectedDateLeaves.is_paid ? 'text-green-600' : 'text-red-600'
                      )}>
                        {selectedDateLeaves.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Worklogs */}
              {selectedDateWorklogs.length > 0 && (
                <Card className="p-3 sm:p-4 rounded-[14px] border-2 bg-gradient-to-br from-card to-muted/30 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <h3 className="font-bold text-sm sm:text-base text-foreground">Worklogs</h3>
                  </div>
                  <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
                    {selectedDateWorklogs.map((log: any) => (
                      <div key={log.id} className="p-2 sm:p-3 rounded-[8px] sm:rounded-[10px] bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
                          <span className="font-semibold text-xs sm:text-sm text-foreground break-words">
                            {log.tasks?.name || log.projects?.name || 'No task/project'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-[6px] w-fit">
                            {log.hours}
                          </span>
                        </div>
                        {log.note && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 leading-relaxed break-words">{log.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t-2 border-border/50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                      <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total Hours</span>
                      <span className="text-base sm:text-lg font-bold text-primary">
                        {selectedDateWorklogs.reduce((sum: number, log: any) => sum + (log.hours_num || 0), 0).toFixed(2)}h
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {!selectedDateLeaves && selectedDateWorklogs.length === 0 && (
                <Card className="p-6 sm:p-8 rounded-[14px] border-2 border-dashed border-border/50">
                  <p className="text-center text-muted-foreground text-xs sm:text-sm">No data available for this day</p>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default UserCalendarView;

