import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity,
  Target,
  DollarSign,
  Zap,
  Award,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  User,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  CalendarDays,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

interface UserPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    efficiency: number;
    projectCount: number;
  };
}

interface UserTask {
  id: string;
  name: string;
  status: string;
  type: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  workLogs: WorkLog[];
}

interface WorkLog {
  id: string;
  date: string;
  hours: string;
  description: string;
  isBillable: boolean;
}

interface CalendarDay {
  date: Date;
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
  workLogs: WorkLog[];
}

interface UserPerformanceData {
  tasks: UserTask[];
  calendarData: CalendarDay[];
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  efficiency: number;
  projectCount: number;
}

export const UserPerformanceModal: React.FC<UserPerformanceModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const [userData, setUserData] = useState<UserPerformanceData>({
    tasks: [],
    calendarData: [],
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    efficiency: 0,
    projectCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null
  });
  const { toast } = useToast();

  const fetchUserPerformanceData = async () => {
    if (!user.id) return;
    
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(currentMonth);
      const endOfCurrentMonth = endOfMonth(currentMonth);
      
      const startDate = dateRange.from || startOfCurrentMonth;
      const endDate = dateRange.to || endOfCurrentMonth;

      // Fetch user's work logs with related data
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users!inner(name, email),
          projects(name, status),
          tasks(name, type, status)
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (workLogsError) throw workLogsError;

      // Fetch user's tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(name, status)
        `)
        .eq('assigned_user_id', user.id);

      if (tasksError) throw tasksError;

      // Process work logs by task
      const taskMap = new Map<string, UserTask>();
      
      workLogs?.forEach(log => {
        if (!log.task_id || !log.tasks) return;
        
        const taskId = log.task_id;
        if (!taskMap.has(taskId)) {
          taskMap.set(taskId, {
            id: taskId,
            name: log.tasks.name,
            status: log.tasks.status,
            type: log.tasks.type,
            projectId: log.project_id,
            projectName: log.projects?.name || 'Unknown Project',
            projectStatus: log.projects?.status || 'Unknown',
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            workLogs: []
          });
        }
        
        const task = taskMap.get(taskId)!;
        if (log.hours) {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          task.totalHours += hours;
          
          if (log.tasks.type === 'billable') {
            task.billableHours += hours;
          } else {
            task.nonBillableHours += hours;
          }
        }
        
        task.workLogs.push({
          id: log.id,
          date: log.created_at,
          hours: log.hours || '0:00',
          description: log.description || '',
          isBillable: log.tasks.type === 'billable'
        });
      });

      // Add tasks without work logs
      tasks?.forEach(task => {
        if (!taskMap.has(task.id)) {
          taskMap.set(task.id, {
            id: task.id,
            name: task.name,
            status: task.status,
            type: task.type,
            projectId: task.project_id,
            projectName: task.projects?.name || 'Unknown Project',
            projectStatus: task.projects?.status || 'Unknown',
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            workLogs: []
          });
        }
      });

      const userTasks = Array.from(taskMap.values()).sort((a, b) => b.totalHours - a.totalHours);

      // Calculate calendar data
      const calendarDays = eachDayOfInterval({ start: startOfCurrentMonth, end: endOfCurrentMonth });
      const calendarData: CalendarDay[] = calendarDays.map(date => {
        const dayWorkLogs = workLogs?.filter(log => 
          isSameDay(new Date(log.created_at), date)
        ) || [];
        
        let billableHours = 0;
        let nonBillableHours = 0;
        
        dayWorkLogs.forEach(log => {
          if (log.hours) {
            const [hoursStr, minutesStr] = log.hours.split(':');
            const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
            
            if (log.tasks?.type === 'billable') {
              billableHours += hours;
            } else {
              nonBillableHours += hours;
            }
          }
        });
        
        return {
          date,
          billableHours,
          nonBillableHours,
          totalHours: billableHours + nonBillableHours,
          workLogs: dayWorkLogs.map(log => ({
            id: log.id,
            date: log.created_at,
            hours: log.hours || '0:00',
            description: log.description || '',
            isBillable: log.tasks?.type === 'billable'
          }))
        };
      });

      // Calculate totals
      const totalHours = userTasks.reduce((sum, task) => sum + task.totalHours, 0);
      const billableHours = userTasks.reduce((sum, task) => sum + task.billableHours, 0);
      const nonBillableHours = userTasks.reduce((sum, task) => sum + task.nonBillableHours, 0);
      
      const completedTasks = userTasks.filter(task => task.status === 'Completed').length;
      const efficiency = userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0;
      
      const projectCount = new Set(userTasks.map(task => task.projectId)).size;

      setUserData({
        tasks: userTasks,
        calendarData,
        totalHours,
        billableHours,
        nonBillableHours,
        efficiency,
        projectCount
      });

    } catch (error) {
      console.error('Error fetching user performance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user performance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user.id) {
      fetchUserPerformanceData();
    }
  }, [isOpen, user.id, currentMonth, dateRange]);

  const getSelectedDateWorkLogs = () => {
    if (!selectedDate) return [];
    return userData.calendarData.find(day => isSameDay(day.date, selectedDate))?.workLogs || [];
  };

  const getSelectedDateTotalHours = () => {
    if (!selectedDate) return { billable: 0, nonBillable: 0, total: 0 };
    const dayData = userData.calendarData.find(day => isSameDay(day.date, selectedDate));
    return {
      billable: dayData?.billableHours || 0,
      nonBillable: dayData?.nonBillableHours || 0,
      total: dayData?.totalHours || 0
    };
  };

  const clearDateRange = () => {
    setDateRange({ from: null, to: null });
  };

  const getCalendarDayClass = (day: CalendarDay) => {
    if (day.totalHours === 0) return 'text-muted-foreground';
    if (day.billableHours > day.nonBillableHours) return 'text-green-600 font-semibold';
    if (day.nonBillableHours > day.billableHours) return 'text-orange-600 font-semibold';
    return 'text-blue-600 font-semibold';
  };

  const getCalendarDayBackground = (day: CalendarDay) => {
    if (day.totalHours === 0) return '';
    const intensity = Math.min(day.totalHours / 8, 1); // Max 8 hours for full opacity
    if (day.billableHours > day.nonBillableHours) {
      return `bg-green-100 hover:bg-green-200`;
    } else if (day.nonBillableHours > day.billableHours) {
      return `bg-orange-100 hover:bg-orange-200`;
    }
    return `bg-blue-100 hover:bg-blue-200`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-bold">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{userData.totalHours.toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{userData.billableHours.toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">Billable</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Activity className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{userData.nonBillableHours.toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">Non-billable</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{userData.efficiency.toFixed(0)}%</div>
                      <div className="text-sm text-muted-foreground">Efficiency</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Date Range Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date Range Filter
                </CardTitle>
                <CardDescription>Filter data by custom date range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48 justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48 justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Button variant="outline" onClick={clearDateRange}>
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="tasks" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tasks">Tasks & Projects</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="details">Daily Details</TabsTrigger>
              </TabsList>

              {/* Tasks & Projects Tab */}
              <TabsContent value="tasks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Tasks & Projects
                    </CardTitle>
                    <CardDescription>
                      All tasks assigned to {user.name} with time tracking details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userData.tasks.map((task) => (
                        <div key={task.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{task.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>
                                  {task.status}
                                </Badge>
                                <Badge variant={task.type === 'billable' ? 'default' : 'outline'}>
                                  {task.type}
                                </Badge>
                                <Badge variant="outline">
                                  {task.projectName}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{task.totalHours.toFixed(1)}h</div>
                              <div className="text-sm text-muted-foreground">
                                {task.billableHours.toFixed(1)}h billable
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="font-semibold text-green-600">{task.billableHours.toFixed(1)}h</div>
                              <div className="text-xs text-muted-foreground">Billable</div>
                            </div>
                            <div className="text-center p-2 bg-orange-50 rounded">
                              <div className="font-semibold text-orange-600">{task.nonBillableHours.toFixed(1)}h</div>
                              <div className="text-xs text-muted-foreground">Non-billable</div>
                            </div>
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="font-semibold text-blue-600">{task.workLogs.length}</div>
                              <div className="text-xs text-muted-foreground">Work Logs</div>
                            </div>
                          </div>

                          {task.workLogs.length > 0 && (
                            <div className="border-t pt-3">
                              <div className="text-sm font-medium text-muted-foreground mb-2">Recent Work Logs:</div>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {task.workLogs.slice(0, 5).map((log) => (
                                  <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3" />
                                      <span>{format(new Date(log.date), 'MMM dd, yyyy')}</span>
                                      <Badge variant={log.isBillable ? 'default' : 'outline'} className="text-xs">
                                        {log.isBillable ? 'Billable' : 'Non-billable'}
                                      </Badge>
                                    </div>
                                    <div className="font-semibold">{log.hours}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {userData.tasks.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No tasks found for this user in the selected date range.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Calendar View Tab */}
              <TabsContent value="calendar" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Calendar View
                    </CardTitle>
                    <CardDescription>
                      Daily breakdown of billable and non-billable hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Calendar Navigation */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-lg font-semibold">
                          {format(currentMonth, 'MMMM yyyy')}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                            {day}
                          </div>
                        ))}
                        
                        {userData.calendarData.map((day, index) => (
                          <div
                            key={index}
                            className={`
                              p-2 min-h-[60px] border rounded cursor-pointer transition-colors
                              ${getCalendarDayBackground(day)}
                              ${selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-primary' : ''}
                            `}
                            onClick={() => setSelectedDate(day.date)}
                          >
                            <div className={`text-sm ${getCalendarDayClass(day)}`}>
                              {format(day.date, 'd')}
                            </div>
                            {day.totalHours > 0 && (
                              <div className="text-xs mt-1 space-y-1">
                                {day.billableHours > 0 && (
                                  <div className="text-green-600 font-semibold">
                                    {day.billableHours.toFixed(1)}h
                                  </div>
                                )}
                                {day.nonBillableHours > 0 && (
                                  <div className="text-orange-600 font-semibold">
                                    {day.nonBillableHours.toFixed(1)}h
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-100 rounded"></div>
                          <span>Billable Hours</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-orange-100 rounded"></div>
                          <span>Non-billable Hours</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-100 rounded"></div>
                          <span>Mixed Hours</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Daily Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Daily Details
                    </CardTitle>
                    <CardDescription>
                      Click on a calendar date to view detailed work logs for that day
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedDate ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                          </h3>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{getSelectedDateTotalHours().total.toFixed(1)}h</div>
                            <div className="text-sm text-muted-foreground">
                              {getSelectedDateTotalHours().billable.toFixed(1)}h billable, {getSelectedDateTotalHours().nonBillable.toFixed(1)}h non-billable
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 bg-green-50 rounded">
                            <div className="text-xl font-bold text-green-600">
                              {getSelectedDateTotalHours().billable.toFixed(1)}h
                            </div>
                            <div className="text-sm text-muted-foreground">Billable Hours</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded">
                            <div className="text-xl font-bold text-orange-600">
                              {getSelectedDateTotalHours().nonBillable.toFixed(1)}h
                            </div>
                            <div className="text-sm text-muted-foreground">Non-billable Hours</div>
                          </div>
                        </div>

                        {getSelectedDateWorkLogs().length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="font-semibold">Work Logs for this day:</h4>
                            {getSelectedDateWorkLogs().map((log) => (
                              <div key={log.id} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={log.isBillable ? 'default' : 'outline'}>
                                      {log.isBillable ? 'Billable' : 'Non-billable'}
                                    </Badge>
                                    <span className="font-semibold">{log.hours}</span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(log.date), 'HH:mm')}
                                  </span>
                                </div>
                                {log.description && (
                                  <p className="text-sm text-muted-foreground">{log.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No work logs found for this date.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Select a date from the calendar view to see detailed work logs.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
