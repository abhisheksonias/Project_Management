import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useAdminWorkCalendar } from '@/features/admin/hooks/useAdminWorkCalendar';
import { CalendarGrid } from '@/features/calendar/ui/CalendarGrid';
import { CalendarStats } from '@/features/calendar/ui/CalendarStats';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, format } from 'date-fns';
import { parseHours } from '@/shared/utils/formatHours';
import { Clock } from 'lucide-react';

const AdminWorkCalendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch all worklogs for the current month
  const { data: worklogs = [], isLoading } = useAdminWorkCalendar(currentMonth);

  // Group worklogs by date and calculate billable/non-billable hours
  const worklogsByDate = useMemo(() => {
    const grouped = new Map<string, { billable: number; nonBillable: number }>();

    worklogs.forEach((log: any) => {
      const dateStr = log.created_at.split('T')[0];
      const hours = log.hours_num || parseHours(log.hours);

      const taskType = log.tasks?.type?.toLowerCase();
      const isBillable = taskType === 'billable';

      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, { billable: 0, nonBillable: 0 });
      }

      const entry = grouped.get(dateStr)!;
      if (isBillable) {
        entry.billable += hours;
      } else {
        entry.nonBillable += hours;
      }
    });

    return grouped;
  }, [worklogs]);

  // Calculate total stats
  const stats = useMemo(() => {
    let billableHours = 0;
    let nonBillableHours = 0;

    worklogsByDate.forEach((entry) => {
      billableHours += entry.billable;
      nonBillableHours += entry.nonBillable;
    });

    return {
      billableHours: Math.round(billableHours * 10) / 10,
      nonBillableHours: Math.round(nonBillableHours * 10) / 10,
      totalHours: Math.round((billableHours + nonBillableHours) * 10) / 10,
    };
  }, [worklogsByDate]);

  // Get calendar days for the month
  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    const lastDay = endOfMonth(currentMonth);
    const startCalendar = startOfWeek(firstDay, { weekStartsOn: 0 });
    const endCalendar = endOfWeek(lastDay, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startCalendar, end: endCalendar });
  }, [currentMonth]);

  // Navigation handlers
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'next'
      ? addMonths(currentMonth, 1)
      : subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDateClick = (date: Date) => {
    // Could open a details dialog showing worklogs for that day
    console.log('Date clicked:', date);
  };

  return (
    <AdminLayout>
      <div className="flex mt-16 sm:mt-0 flex-col min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="flex-1">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Work Calendar</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    View billable and non-billable hours by day
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Total Billable Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-green-700" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-700">
                          {stats.billableHours.toFixed(1)}h
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stats.totalHours > 0
                            ? `${Math.round((stats.billableHours / stats.totalHours) * 100)}% of total`
                            : '0% of total'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Total Non-Billable Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {stats.nonBillableHours.toFixed(1)}h
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stats.totalHours > 0
                            ? `${Math.round((stats.nonBillableHours / stats.totalHours) * 100)}% of total`
                            : '0% of total'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Total Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {stats.totalHours.toFixed(1)}h
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(currentMonth, 'MMMM yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Calendar Navigation */}
              <Card className="rounded-[14px]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} className="h-8 w-8 sm:h-10 sm:w-10">
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <div className="text-base sm:text-lg md:text-xl font-bold min-w-[150px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} className="h-8 w-8 sm:h-10 sm:w-10">
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button variant="outline" onClick={goToToday} className="text-xs sm:text-sm h-8 sm:h-10">
                        Today
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-primary" />
                        <span className="text-xs sm:text-sm">Billable</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-gray-400" />
                        <span className="text-xs sm:text-sm">Non-billable</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendar Stats */}
              {/* <CalendarStats
                billableHours={stats.billableHours}
                nonBillableHours={stats.nonBillableHours}
                totalHours={stats.totalHours}
              /> */}

              {/* Calendar Grid */}
              <CalendarGrid
                calendarDays={calendarDays}
                currentMonth={currentMonth}
                worklogsByDate={worklogsByDate}
                onDateClick={handleDateClick}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWorkCalendar;

