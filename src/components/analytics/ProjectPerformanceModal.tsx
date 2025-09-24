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
import { Switch } from '@/components/ui/switch';
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
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

interface ProjectPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    type: string;
    category?: string;
    reference?: string;
    status: string;
    deadline: string | null;
    created_at: string;
    description?: string;
    admin_name?: string;
  };
}

interface ProjectTask {
  id: string;
  name: string;
  status: string;
  type: string;
  priority: string;
  estimate_hours: number;
  assignedUserId: string;
  assignedUserName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  workLogs: WorkLog[];
  isAssigned: boolean;
}

interface WorkLog {
  id: string;
  date: string;
  hours: string;
  description: string;
  isBillable: boolean;
  userName?: string;
  taskName?: string;
  createdAt?: string;
}

interface CalendarDay {
  date: Date;
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
  workLogs: WorkLog[];
}

interface ProjectPerformanceData {
  tasks: ProjectTask[];
  calendarData: CalendarDay[];
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  completionRate: number;
  userCount: number;
  taskCount: number;
}

interface UserGroup {
  userId: string;
  userName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  workLogCount: number;
  tasks: ProjectTask[];
}

export const ProjectPerformanceModal: React.FC<ProjectPerformanceModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const [projectData, setProjectData] = useState<ProjectPerformanceData>({
    tasks: [],
    calendarData: [],
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    completionRate: 0,
    userCount: 0,
    taskCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null
  });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
  const [userWiseSort, setUserWiseSort] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'thisWeek' | 'thisMonth' | 'custom'>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { toast } = useToast();

  const fetchProjectPerformanceData = async () => {
    if (!project.id) return;
    
    try {
      setLoading(true);
      
      // Calculate date range based on selected filter
      const dateRangeFilter = getDateRange();
      const startDate = dateRangeFilter.from;
      const endDate = dateRangeFilter.to;

      // Validate dates
      if (!startDate || !endDate) {
        throw new Error('Invalid date range selected');
      }

      // Fetch project's work logs with related data
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users!inner(name, email),
          projects(name, status),
          tasks(name, type, status, priority, estimate_hours, assigned_user_id)
        `)
        .eq('project_id', project.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (workLogsError) throw workLogsError;

      // Fetch project's tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          users(name),
          projects(name, status)
        `)
        .eq('project_id', project.id);

      if (tasksError) throw tasksError;

      // Process work logs by task
      const taskMap = new Map<string, ProjectTask>();
      
      workLogs?.forEach(log => {
        if (!log.task_id || !log.tasks) return;
        
        const taskId = log.task_id;
        if (!taskMap.has(taskId)) {
          taskMap.set(taskId, {
            id: taskId,
            name: log.tasks.name,
            status: log.tasks.status,
            type: log.tasks.type,
            priority: log.tasks.priority || 'Not Set',
            estimate_hours: log.tasks.estimate_hours || 0,
            assignedUserId: log.tasks.assigned_user_id || '',
            assignedUserName: log.users?.name || 'Unassigned',
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            workLogs: [],
            isAssigned: false
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
          description: log.note || '',
          isBillable: log.tasks.type === 'billable',
          userName: log.users?.name || 'Unknown User',
          taskName: log.tasks.name || 'Unknown Task',
          createdAt: log.created_at
        });
      });

      // Add tasks without work logs and mark assigned tasks
      tasks?.forEach(task => {
        if (!taskMap.has(task.id)) {
          taskMap.set(task.id, {
            id: task.id,
            name: task.name,
            status: task.status,
            type: task.type,
            priority: task.priority || 'Not Set',
            estimate_hours: task.estimate_hours || 0,
            assignedUserId: task.assigned_user_id || '',
            assignedUserName: task.users?.name || 'Unassigned',
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            workLogs: [],
            isAssigned: true
          });
        } else {
          // Mark existing task as assigned
          const existingTask = taskMap.get(task.id)!;
          existingTask.isAssigned = true;
        }
      });

      const projectTasks = Array.from(taskMap.values()).sort((a, b) => b.totalHours - a.totalHours);

      // Calculate calendar data
      const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
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
            description: log.note || '',
            isBillable: log.tasks?.type === 'billable',
            userName: log.users?.name || 'Unknown User',
            taskName: log.tasks?.name || 'Unknown Task',
            createdAt: log.created_at
          }))
        };
      });

      // Calculate totals
      const totalHours = projectTasks.reduce((sum, task) => sum + task.totalHours, 0);
      const billableHours = projectTasks.reduce((sum, task) => sum + task.billableHours, 0);
      const nonBillableHours = projectTasks.reduce((sum, task) => sum + task.nonBillableHours, 0);
      
      const completedTasks = projectTasks.filter(task => task.status === 'Completed').length;
      const completionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
      
      const userCount = new Set(projectTasks.map(task => task.assignedUserId)).size;

      setProjectData({
        tasks: projectTasks,
        calendarData,
        totalHours,
        billableHours,
        nonBillableHours,
        completionRate,
        userCount,
        taskCount: projectTasks.length
      });

    } catch (error) {
      console.error('Error fetching project performance data:', error);
      console.error('Date filter:', dateFilter);
      console.error('Date range:', dateRange);
      console.error('Date range filter result:', getDateRange());
      
      toast({
        title: 'Error',
        description: `Failed to load project performance data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && project.id) {
      fetchProjectPerformanceData();
    }
  }, [isOpen, project.id, currentMonth, dateRange, dateFilter]);

  const getSelectedDateWorkLogs = () => {
    if (!selectedDate) return [];
    return projectData.calendarData.find(day => isSameDay(day.date, selectedDate))?.workLogs || [];
  };

  const getSelectedDateTotalHours = () => {
    if (!selectedDate) return { billable: 0, nonBillable: 0, total: 0 };
    const dayData = projectData.calendarData.find(day => isSameDay(day.date, selectedDate));
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

  const getUserGroups = (): UserGroup[] => {
    const userMap = new Map<string, UserGroup>();
    
    projectData.tasks.forEach(task => {
      if (!userMap.has(task.assignedUserId)) {
        userMap.set(task.assignedUserId, {
          userId: task.assignedUserId,
          userName: task.assignedUserName,
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          workLogCount: 0,
          tasks: []
        });
      }
      
      const user = userMap.get(task.assignedUserId)!;
      user.totalHours += task.totalHours;
      user.billableHours += task.billableHours;
      user.nonBillableHours += task.nonBillableHours;
      user.workLogCount += task.workLogs.length;
      user.tasks.push(task);
    });
    
    return Array.from(userMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        };
      case 'thisWeek':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return {
          from: startOfWeek,
          to: now
        };
      case 'thisMonth':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now)
        };
      case 'custom':
        if (dateRange.from && dateRange.to) {
          return dateRange;
        } else {
          // Fallback to this month if custom dates are not set
          return {
            from: startOfMonth(now),
            to: endOfMonth(now)
          };
        }
      default:
        return {
          from: startOfMonth(now),
          to: endOfMonth(now)
        };
    }
  };

  const getSortedUserGroups = (): UserGroup[] => {
    const users = getUserGroups();
    return users.sort((a, b) => {
      if (sortBy === 'latest') {
        return b.totalHours - a.totalHours;
      } else {
        return a.totalHours - b.totalHours;
      }
    });
  };

  const getSortedTasks = (): ProjectTask[] => {
    return projectData.tasks.sort((a, b) => {
      // First apply user-wise sorting if enabled
      if (userWiseSort && a.assignedUserName !== b.assignedUserName) {
        return a.assignedUserName.localeCompare(b.assignedUserName);
      }
      
      // Then apply hour-based sorting
      if (sortBy === 'latest') {
        return b.totalHours - a.totalHours;
      } else {
        return a.totalHours - b.totalHours;
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                <Briefcase className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-bold">{project.name}</div>
              <div className="text-sm text-muted-foreground">
                {project.category && (
                  <Badge variant="secondary" className="mr-2">
                    {project.category}
                  </Badge>
                )}
                {project.reference && (
                  <span className="text-xs">Ref: {project.reference}</span>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{formatHours(projectData.totalHours)}</div>
                      <div className="text-xs text-muted-foreground">Total Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{formatHours(projectData.billableHours)}</div>
                      <div className="text-xs text-muted-foreground">Billable Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{projectData.userCount}</div>
                      <div className="text-xs text-muted-foreground">Team Members</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{projectData.completionRate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Completion Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users">Team Members</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="details">Daily Details</TabsTrigger>
              </TabsList>

              {/* Team Members Tab */}
              <TabsContent value="users" className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Team Members Performance</h2>
                    <div className="flex items-center gap-2">
                      <Select value={dateFilter} onValueChange={(value: any) => {
                        setDateFilter(value);
                        if (value === 'custom') {
                          setShowDatePicker(true);
                        }
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="thisWeek">This Week</SelectItem>
                          <SelectItem value="thisMonth">This Month</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">Latest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={userWiseSort} 
                          onCheckedChange={setUserWiseSort}
                          id="user-sort"
                        />
                        <label htmlFor="user-sort" className="text-xs text-gray-600">
                          User Wise
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {getSortedUserGroups().map((userGroup) => (
                      <UserCard key={userGroup.userId} userGroup={userGroup} />
                    ))}
                    
                    {getSortedUserGroups().length === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No team members found for this project in the selected date range.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Tasks Performance</h2>
                    <div className="flex items-center gap-2">
                      <Select value={dateFilter} onValueChange={(value: any) => {
                        setDateFilter(value);
                        if (value === 'custom') {
                          setShowDatePicker(true);
                        }
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="thisWeek">This Week</SelectItem>
                          <SelectItem value="thisMonth">This Month</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">Latest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={userWiseSort} 
                          onCheckedChange={setUserWiseSort}
                          id="user-sort-task"
                        />
                        <label htmlFor="user-sort-task" className="text-xs text-gray-600">
                          User Wise
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {getSortedTasks().map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                    
                    {getSortedTasks().length === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No tasks found for this project in the selected date range.
                      </div>
                    )}
                  </div>
                </div>
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
                         
                         {(() => {
                           // Get the first day of the current month
                           const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                           const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                           
                           // Get the starting day of the week (0 = Sunday, 1 = Monday, etc.)
                           const startDayOfWeek = firstDayOfMonth.getDay();
                           
                           // Create array for the calendar grid
                           const calendarDays = [];
                           
                           // Add empty cells for days before the first day of the month
                           for (let i = 0; i < startDayOfWeek; i++) {
                             calendarDays.push(null);
                           }
                           
                           // Add all days of the current month
                           for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
                             const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                             calendarDays.push(currentDate);
                           }
                           
                           return calendarDays.map((date, index) => {
                             if (!date) {
                               return <div key={index} className="p-2 min-h-[60px]"></div>;
                             }
                             
                             // Find work log data for this date
                             const dayData = projectData.calendarData.find(day => isSameDay(day.date, date));
                             
                             return (
                               <div
                                 key={index}
                                 className={`
                                   p-2 min-h-[60px] border rounded cursor-pointer transition-colors
                                   ${dayData ? getCalendarDayBackground(dayData) : ''}
                                   ${selectedDate && isSameDay(date, selectedDate) ? 'ring-2 ring-primary' : ''}
                                 `}
                                 onClick={() => setSelectedDate(date)}
                               >
                                 <div className={`text-sm ${dayData ? getCalendarDayClass(dayData) : 'text-muted-foreground'}`}>
                                   {format(date, 'd')}
                                 </div>
                                 {dayData && dayData.totalHours > 0 && (
                                   <div className="text-xs mt-1 space-y-1">
                                     {dayData.billableHours > 0 && (
                                       <div className="text-green-600 font-semibold">
                                         {dayData.billableHours.toFixed(1)}h
                                       </div>
                                     )}
                                     {dayData.nonBillableHours > 0 && (
                                       <div className="text-orange-600 font-semibold">
                                         {dayData.nonBillableHours.toFixed(1)}h
                                       </div>
                                     )}
                                   </div>
                                 )}
                               </div>
                             );
                           });
                         })()}
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
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div className="text-center p-1 bg-green-50 rounded">
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
                              <div key={log.id} className="p-3 border rounded-lg space-y-2">
                                {/* Header Row: Billable/Non-billable + User + Date + Hours */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant={log.isBillable ? 'default' : 'outline'}>
                                      {log.isBillable ? 'Billable' : 'Non-billable'}
                                    </Badge>
                                    <span className="font-semibold text-sm">{log.userName || 'Unknown User'}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="text-gray-600">
                                      {log.createdAt ? format(new Date(log.createdAt), 'MMM dd, HH:mm') : 'Unknown'}
                                    </span>
                                    <span className="font-semibold text-blue-600">{log.hours}</span>
                                  </div>
                                </div>
                                
                                {/* Task Name */}
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Task: </span>
                                  <span className="font-semibold">{log.taskName || 'Unknown Task'}</span>
                                </div>
                                
                                {/* Description/Note */}
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Note: </span>
                                  <span className="text-gray-800">{log.description || 'No description'}</span>
                                </div>
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

        {/* Custom Date Picker Modal */}
        {showDatePicker && (
          <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select Custom Date Range</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDatePicker(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    if (dateRange.from && dateRange.to) {
                      // Validate that from date is before to date
                      if (dateRange.from <= dateRange.to) {
                        setDateFilter('custom');
                        setShowDatePicker(false);
                      } else {
                        toast({
                          title: 'Invalid Date Range',
                          description: 'From date must be before To date',
                          variant: 'destructive',
                        });
                      }
                    } else {
                      toast({
                        title: 'Missing Dates',
                        description: 'Please select both From and To dates',
                        variant: 'destructive',
                      });
                    }
                  }}>
                    Apply
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

// User Card Component
const UserCard: React.FC<{ userGroup: UserGroup }> = ({ userGroup }) => {
  const [expanded, setExpanded] = useState(false);

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      {/* User Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {userGroup.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-base font-semibold">{userGroup.userName}</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-gray-600">{userGroup.workLogCount}</span>
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-green-600">{formatHours(userGroup.billableHours)}</span>
            <span className="font-bold text-red-600">{formatHours(userGroup.nonBillableHours)}</span>
            <span className="font-bold text-gray-800">{formatHours(userGroup.totalHours)}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-1 h-6 w-6"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Expanded Task Entries */}
      {expanded && (
        <div className="space-y-2 border-t pt-3">
          {userGroup.tasks.map((task) => (
            <div key={task.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Assignment Status Dot */}
                  <div className={`w-2 h-2 rounded-full ${task.isAssigned ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <h4 className="text-sm font-medium">{task.name}</h4>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    {task.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-green-600">{formatHours(task.billableHours)}</span>
                  <span className="font-bold text-red-600">{formatHours(task.nonBillableHours)}</span>
                  <span className="font-bold text-gray-800">{formatHours(task.totalHours)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Task Card Component
const TaskCard: React.FC<{ task: ProjectTask }> = ({ task }) => {
  const [expanded, setExpanded] = useState(false);

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      {/* Task Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {/* Assignment Status Dot */}
            <div className={`w-2 h-2 rounded-full ${task.isAssigned ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <h3 className="text-base font-semibold">{task.name}</h3>
            <Badge variant="secondary" className="bg-black/70 text-white text-xs">
              {task.status}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
              {task.type}
            </Badge>
          </div>
          <span className="text-xs text-gray-500">{task.assignedUserName}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-gray-600">{task.workLogs.length}</span>
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-green-600">{formatHours(task.billableHours)}</span>
            <span className="font-bold text-red-600">{formatHours(task.nonBillableHours)}</span>
            <span className="font-bold text-gray-800">{formatHours(task.totalHours)}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-1 h-6 w-6"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Expanded Work Log Entries */}
      {expanded && (
        <div className="space-y-2 border-t pt-3">
          {task.workLogs.length > 0 ? (
            task.workLogs.map((workLog) => (
              <div key={workLog.id} className="space-y-2 bg-white border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{format(new Date(workLog.date), 'MMM dd, yyyy HH:mm')}</h4>
                      <div className="text-xs bg-white border rounded px-2 py-1 truncate">
                        <span className="font-bold">Note:</span> {workLog.description || 'No description'}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-gray-800">
                      {workLog.hours}
                    </div>
                  </div>
              </div>
            ))
          ) : (
            <div className="text-center py-3 text-gray-500 text-sm">
              No work logs found for this task.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
