import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WorkLogEntry {
  id: string;
  hours: string;
  note: string | null;
  created_at: string;
  projects: { name: string; type: string };
  tasks: { name: string; status: string; type: string } | null;
}

interface DayData {
  date: Date;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  workLogs: WorkLogEntry[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const WorkLogCalendar: React.FC = () => {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date()); // Start with current month
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { toast } = useToast();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const fetchWorkLogs = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Get start and end of current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          id,
          hours,
          note,
          created_at,
          projects(name, type),
          tasks(name, status, type)
        `)
        .eq('user_id', profile.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error fetching work logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load work logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkLogs();
  }, [profile?.id, currentDate]);

  const formatDuration = (hours: string) => {
    if (!hours) return '0h';
    const [hoursStr, minutesStr] = hours.split(':');
    const hoursCount = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    if (minutes === 0) {
      return `${hoursCount}h`;
    }
    return `${hoursCount}h ${minutes}m`;
  };

  const calculateDayHours = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayLogs = workLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= dayStart && logDate <= dayEnd;
    });

    const totalHours = dayLogs.reduce((total, log) => {
      if (!log.hours) return total;
      const [hoursStr, minutesStr] = log.hours.split(':');
      const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
      return total + hours;
    }, 0);

    const billableHours = dayLogs.reduce((total, log) => {
      if (!log.hours) return total;
      // Check task type first, then fallback to project type
      const taskType = log.tasks?.type?.toLowerCase();
      const projectType = log.projects?.type?.toLowerCase();
      const isBillable = taskType === 'billable' || (taskType !== 'non-billable' && projectType === 'billable');
      
      if (!isBillable) return total;
      const [hoursStr, minutesStr] = log.hours.split(':');
      const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
      return total + hours;
    }, 0);

    const nonBillableHours = totalHours - billableHours;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      nonBillableHours: Math.round(nonBillableHours * 100) / 100,
      workLogs: dayLogs
    };
  };

  const generateCalendarDays = (): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: DayData[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayData = calculateDayHours(date);
      
      days.push({
        date,
        ...dayData,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString()
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayColor = (day: DayData) => {
    if (!day.isCurrentMonth) return 'text-muted-foreground bg-muted/30';
    if (day.isToday) return 'bg-blue-100 text-blue-900 font-bold';
    if (day.totalHours > 0) return 'bg-green-50 text-green-900';
    return 'text-foreground';
  };

  const getHoursColor = (hours: number) => {
    if (hours === 0) return 'text-muted-foreground';
    if (hours < 4) return 'text-orange-600';
    if (hours < 8) return 'text-green-600';
    return 'text-blue-600';
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Work Log Calendar - {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <CardDescription>
                View your work logs day by day
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading calendar...</div>
            </div>
          ) : (
            <>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      p-2 min-h-[80px] border rounded-lg cursor-pointer transition-colors
                      hover:bg-muted/50 ${getDayColor(day)}
                    `}
                    onClick={() => setSelectedDay(day.date)}
                  >
                    <div className="text-sm font-medium mb-1">
                      {day.date.getDate()}
                    </div>
                    {day.totalHours > 0 && (
                      <div className="space-y-1">
                        <div className={`text-xs font-medium ${getHoursColor(day.totalHours)}`}>
                          {day.totalHours}h
                        </div>
                        {day.billableHours > 0 && (
                          <div className="text-xs text-green-600">
                            B: {day.billableHours}h
                          </div>
                        )}
                        {day.nonBillableHours > 0 && (
                          <div className="text-xs text-red-600">
                            N: {day.nonBillableHours}h
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Work Logs for {selectedDay.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const dayData = calculateDayHours(selectedDay);
              if (dayData.workLogs.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    No work logs for this day
                  </div>
                );
              }
              
              return (
                <div className="space-y-4">
                  {/* Day Summary */}
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {dayData.totalHours}h
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {dayData.billableHours}h
                      </div>
                      <div className="text-sm text-muted-foreground">Billable</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">
                        {dayData.nonBillableHours}h
                      </div>
                      <div className="text-sm text-muted-foreground">Non-Billable</div>
                    </div>
                  </div>
                  
                  {/* Work Log Entries */}
                  <div className="space-y-3">
                    {dayData.workLogs.map((log) => (
                      <div key={log.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">
                              {log.tasks?.name || 'No Task'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.projects?.name || 'Unknown Project'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatDuration(log.hours)}
                            </div>
                            <Badge variant={(log.tasks?.type || log.projects?.type || 'non-billable').toLowerCase() === 'billable' ? 'default' : 'secondary'}>
                              {log.tasks?.type || log.projects?.type || 'Non-billable'}
                            </Badge>
                          </div>
                        </div>
                        {log.note && (
                          <div className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Note:</span> {log.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
