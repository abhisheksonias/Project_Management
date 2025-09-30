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
  contributingUsers: Map<string, {
    userId: string;
    userName: string;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    workLogs: any[];
    taskContributions: Map<string, {
      taskId: string;
      taskName: string;
      taskType: string;
      taskStatus: string;
      hours: number;
      billableHours: number;
      nonBillableHours: number;
      workLogs: any[];
    }>;
  }>;
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
    taskCount: 0,
    contributingUsers: new Map()
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

      // Fetch project's work logs with related data - this is the primary data source
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users!inner(name, email),
          tasks!inner(name, type, status, priority, estimate_hours, assigned_user_id)
        `)
        .eq('project_id', project.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (workLogsError) throw workLogsError;

      console.log('Work logs fetched:', workLogs?.length || 0, 'for date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        filter: dateFilter
      });

      // STEP 1: Get all users who contributed to this project via work logs
      const contributingUsersMap = new Map<string, {
        userId: string;
        userName: string;
        totalHours: number;
        billableHours: number;
        nonBillableHours: number;
        workLogs: any[];
        taskContributions: Map<string, {
          taskId: string;
          taskName: string;
          taskType: string;
          taskStatus: string;
          hours: number;
          billableHours: number;
          nonBillableHours: number;
          workLogs: any[];
        }>;
      }>();

      console.log('Processing work logs for project:', project.id);
      console.log('Work logs data:', workLogs?.slice(0, 2)); // Show sample data

      workLogs?.forEach(log => {
        if (!log.users || !log.tasks || !log.user_id || !log.task_id) {
          console.log('Skipping incomplete log:', log.id);
          return;
        }

        const userId = log.user_id;
        const userName = log.users.name;
        const taskId = log.task_id;
        const taskName = log.tasks.name;
        const taskType = log.tasks.type || 'non-billable'; // Default to non-billable
        const taskStatus = log.tasks.status || 'Unknown';

        // Initialize user if not exists
        if (!contributingUsersMap.has(userId)) {
          contributingUsersMap.set(userId, {
            userId,
            userName,
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            workLogs: [],
            taskContributions: new Map()
          });
        }

        const user = contributingUsersMap.get(userId)!;

        // Calculate hours from this work log
        let hours = 0;
        if (log.hours) {
          const hoursParts = log.hours.split(':');
          const hoursStr = hoursParts[0] || '0';
          const minutesStr = hoursParts[1] || '0';
          hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
        }

        // Add work log to user
        user.workLogs.push(log);
        user.totalHours += hours;

        // Determine if billable based on task type
        const isBillable = taskType === 'billable';
        if (isBillable) {
          user.billableHours += hours;
        } else {
          user.nonBillableHours += hours;
        }

        // STEP 2: Track task contributions for each user
        if (!user.taskContributions.has(taskId)) {
          user.taskContributions.set(taskId, {
            taskId,
            taskName,
            taskType,
            taskStatus,
            hours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            workLogs: []
          });
        }

        const taskContribution = user.taskContributions.get(taskId)!;
        taskContribution.hours += hours;
        taskContribution.workLogs.push(log);

        if (isBillable) {
          taskContribution.billableHours += hours;
        } else {
          taskContribution.nonBillableHours += hours;
        }
      });

      console.log('Contributing users found:', contributingUsersMap.size);
      contributingUsersMap.forEach((user, userId) => {
        console.log(`User ${user.userName} (${userId}):`, {
          totalHours: user.totalHours,
          billableHours: user.billableHours,
          nonBillableHours: user.nonBillableHours,
          tasksCount: user.taskContributions.size
        });
      });

      // STEP 3: Convert to ProjectTask format for UI compatibility
      const projectTasks: ProjectTask[] = [];
      contributingUsersMap.forEach(user => {
        user.taskContributions.forEach(taskContrib => {
          projectTasks.push({
            id: taskContrib.taskId,
            name: taskContrib.taskName,
            status: taskContrib.taskStatus,
            type: taskContrib.taskType,
            priority: 'Not Set',
            estimate_hours: 0,
            assignedUserId: user.userId,
            assignedUserName: user.userName,
            totalHours: taskContrib.hours,
            billableHours: taskContrib.billableHours,
            nonBillableHours: taskContrib.nonBillableHours,
            workLogs: taskContrib.workLogs.map(log => ({
              id: log.id,
              date: log.created_at,
              hours: log.hours || '0:00',
              description: log.note || '',
              isBillable: taskContrib.taskType === 'billable',
              userName: user.userName,
              taskName: taskContrib.taskName,
              createdAt: log.created_at
            })),
            isAssigned: true
          });
        });
      });

      console.log('Final project tasks processed:', projectTasks.length);

      // Calculate calendar data based on work logs
      const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
      const calendarData: CalendarDay[] = calendarDays.map(date => {
        const dayWorkLogs = workLogs?.filter(log =>
          isSameDay(new Date(log.created_at), date)
        ) || [];

        let billableHours = 0;
        let nonBillableHours = 0;

        dayWorkLogs.forEach(log => {
          if (log.hours && log.tasks) {
            const hoursParts = log.hours.split(':');
            const hoursStr = hoursParts[0] || '0';
            const minutesStr = hoursParts[1] || '0';
            const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);

            // Billable/Non-billable based on the task type associated with this work log
            if (log.tasks.type === 'billable') {
              billableHours += hours;
            } else {
              nonBillableHours += hours;
            }
          }
        });

        return {
          date,
          billableHours: Math.round(billableHours * 100) / 100,
          nonBillableHours: Math.round(nonBillableHours * 100) / 100,
          totalHours: Math.round((billableHours + nonBillableHours) * 100) / 100,
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

      console.log('Calendar data calculated:', calendarData.length, 'days, with work logs:', calendarData.filter(day => day.totalHours > 0).length);

      // Calculate totals based on work logs (actual contribution)
      const totalHours = projectTasks.reduce((sum, task) => sum + task.totalHours, 0);
      const billableHours = projectTasks.reduce((sum, task) => sum + task.billableHours, 0);
      const nonBillableHours = projectTasks.reduce((sum, task) => sum + task.nonBillableHours, 0);

      const completedTasks = projectTasks.filter(task => task.status === 'Completed').length;
      const completionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

      // Count users who actually contributed (have work logs) in the selected date range
      const contributingUsers = new Set<string>();
      workLogs?.forEach(log => {
        if (log.users && log.user_id) {
          contributingUsers.add(log.user_id);
        }
      });
      const userCount = contributingUsers.size;

      console.log('Final project data calculated:', {
        workLogsCount: workLogs?.length || 0,
        tasksCount: projectTasks.length,
        tasksWithWorkLogs: projectTasks.filter(t => t.workLogs.length > 0).length,
        totalHours,
        billableHours,
        nonBillableHours,
        contributingUsers: userCount,
        completionRate
      });

      // Debug work log to user mapping
      const workLogUsers = workLogs?.map(log => ({
        logId: log.id,
        userId: log.user_id,
        userName: log.users?.name,
        taskId: log.task_id,
        taskName: log.tasks?.name,
        taskType: log.tasks?.type,
        hours: log.hours
      })) || [];
      console.log('Work log users debug:', workLogUsers.slice(0, 5)); // Show first 5 for brevity

      setProjectData({
        tasks: projectTasks,
        calendarData,
        totalHours,
        billableHours,
        nonBillableHours,
        completionRate,
        userCount,
        taskCount: projectTasks.length,
        contributingUsers: contributingUsersMap
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
    // Convert contributingUsers to UserGroup format
    const userGroups: UserGroup[] = [];

    projectData.contributingUsers.forEach((userData, userId) => {
      // Get all tasks for this user from projectData.tasks
      const userTasks = projectData.tasks.filter(task => task.assignedUserId === userId);

      userGroups.push({
        userId: userData.userId,
        userName: userData.userName,
        totalHours: userData.totalHours,
        billableHours: userData.billableHours,
        nonBillableHours: userData.nonBillableHours,
        workLogCount: userData.workLogs.length,
        tasks: userTasks
      });
    });

    const result = userGroups.sort((a, b) => b.totalHours - a.totalHours);

    console.log('getUserGroups result:', result.map(u => ({
      userName: u.userName,
      totalHours: u.totalHours,
      billableHours: u.billableHours,
      nonBillableHours: u.nonBillableHours,
      tasksCount: u.tasks.length,
      workLogCount: u.workLogCount
    })));

    return result;
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
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return {
          from: todayStart,
          to: todayEnd
        };
      case 'thisWeek':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        return {
          from: startOfWeek,
          to: endOfWeek
        };
      case 'thisMonth':
        const monthStart = startOfMonth(now);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = endOfMonth(now);
        monthEnd.setHours(23, 59, 59, 999);
        return {
          from: monthStart,
          to: monthEnd
        };
      case 'custom':
        if (dateRange.from && dateRange.to) {
          const customStart = new Date(dateRange.from);
          customStart.setHours(0, 0, 0, 0);
          const customEnd = new Date(dateRange.to);
          customEnd.setHours(23, 59, 59, 999);
          return {
            from: customStart,
            to: customEnd
          };
        } else {
          // Fallback to this month if custom dates are not set
          const fallbackStart = startOfMonth(now);
          fallbackStart.setHours(0, 0, 0, 0);
          const fallbackEnd = endOfMonth(now);
          fallbackEnd.setHours(23, 59, 59, 999);
          return {
            from: fallbackStart,
            to: fallbackEnd
          };
        }
      default:
        const defaultStart = startOfMonth(now);
        defaultStart.setHours(0, 0, 0, 0);
        const defaultEnd = endOfMonth(now);
        defaultEnd.setHours(23, 59, 59, 999);
        return {
          from: defaultStart,
          to: defaultEnd
        };
    }
  };

  const getSortedUserGroups = (): UserGroup[] => {
    const users = getUserGroups();

    // Debug: Log user groups to see duplicates
    console.log('User groups before filtering:', users.map(u => ({
      userId: u.userId,
      userName: u.userName,
      totalHours: u.totalHours,
      taskCount: u.tasks.length
    })));

    // Filter out users with no work logs or hours in the selected date range
    const usersWithData = users.filter(user => user.totalHours > 0 || user.workLogCount > 0);

    console.log('User groups after filtering:', usersWithData.map(u => ({
      userId: u.userId,
      userName: u.userName,
      totalHours: u.totalHours,
      taskCount: u.tasks.length
    })));

    return usersWithData.sort((a, b) => {
      if (sortBy === 'latest') {
        return b.totalHours - a.totalHours;
      } else {
        return a.totalHours - b.totalHours;
      }
    });
  };

  const getSortedTasks = (): ProjectTask[] => {
    // Create a unique tasks list (no duplicates) with combined data from all contributors
    const taskMap = new Map<string, ProjectTask>();

    projectData.tasks.forEach(task => {
      if (task.workLogs.length === 0) return;

      if (!taskMap.has(task.id)) {
        taskMap.set(task.id, {
          id: task.id,
          name: task.name,
          status: task.status,
          type: task.type,
          priority: task.priority,
          estimate_hours: task.estimate_hours,
          assignedUserId: task.assignedUserId,
          assignedUserName: task.assignedUserName,
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          workLogs: [],
          isAssigned: task.isAssigned
        });
      }

      const uniqueTask = taskMap.get(task.id)!;
      uniqueTask.totalHours += task.totalHours;
      uniqueTask.billableHours += task.billableHours;
      uniqueTask.nonBillableHours += task.nonBillableHours;
      uniqueTask.workLogs.push(...task.workLogs);
    });

    // Remove duplicate work logs (same id)
    taskMap.forEach(task => {
      const uniqueWorkLogs = new Map<string, WorkLog>();
      task.workLogs.forEach(log => {
        uniqueWorkLogs.set(log.id, log);
      });
      task.workLogs = Array.from(uniqueWorkLogs.values()).sort((a, b) =>
        new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      );
    });

    const uniqueTasks = Array.from(taskMap.values());

    return uniqueTasks.sort((a, b) => {
      // Sort by total hours descending by default
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-center items-center gap-2">
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
                  <div className="flex justify-center items-center gap-2">
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
                  <div className="flex justify-center items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{projectData.userCount}</div>
                      <div className="text-xs text-muted-foreground">Team Members</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{projectData.completionRate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Completion Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card> */}
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
                    <div>
                      <h2 className="text-xl font-bold">Team Members Performance</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Shows team members who contributed to this project through work logs in the selected date range
                      </p>
                    </div>
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
                    </div>
                  </div>


                  <div className="space-y-3">
                    {getSortedUserGroups().map((userGroup, index) => (
                      <UserCard key={`${userGroup.userId}-${userGroup.userName}-${index}`} userGroup={userGroup} />
                    ))}

                    {getSortedUserGroups().length === 0 && (
                      <Card className="border-dashed">
                        <CardContent className="text-center py-8">
                          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="text-muted-foreground text-sm">
                            No team members with work logs found for the selected date range.
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Try selecting a different date range or check if work logs exist for this project.
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Tasks Performance</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        All tasks associated with this project that have work logs. Click to expand and view detailed work log entries with date, time, user, and description.
                      </p>
                    </div>
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
                          <SelectItem value="latest">Most Hours First</SelectItem>
                          <SelectItem value="oldest">Least Hours First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {getSortedTasks().map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}

                    {getSortedTasks().length === 0 && (
                      <Card className="border-dashed">
                        <CardContent className="text-center py-8">
                          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="text-muted-foreground text-sm">
                            No tasks with work logs found for the selected date range.
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Try selecting a different date range or check if work logs exist for this project.
                          </div>
                        </CardContent>
                      </Card>
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
                          <Card className="border-dashed">
                            <CardContent className="text-center py-8">
                              <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                              <div className="text-muted-foreground text-sm">
                                No work logs found for this date.
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Select a different date from the calendar view.
                              </div>
                            </CardContent>
                          </Card>
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
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-bold text-green-600" title="Billable Hours">{formatHours(userGroup.billableHours)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="font-bold text-orange-600" title="Non-billable Hours">{formatHours(userGroup.nonBillableHours)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span className="font-bold text-gray-800" title="Total Hours">{formatHours(userGroup.totalHours)}</span>
            </div>
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
        <div className="space-y-3 border-t pt-3">
          <h4 className="text-sm font-semibold text-gray-700">Tasks Contributed:</h4>
          {userGroup.tasks.map((task) => (
            <div key={task.id} className="bg-white border rounded-lg p-3 space-y-2">
              {/* Task Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${task.type === 'billable' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  <h5 className="text-sm font-medium">{task.name}</h5>
                  <Badge variant="outline" className={`text-xs ${task.type === 'billable' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                    {task.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {task.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {task.workLogs.length} work log{task.workLogs.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-green-600" title="Billable Hours">{formatHours(task.billableHours)}</span>
                  <span className="font-bold text-orange-600" title="Non-billable Hours">{formatHours(task.nonBillableHours)}</span>
                  <span className="font-bold text-gray-800" title="Total Hours">{formatHours(task.totalHours)}</span>
                </div>
              </div>
            </div>
          ))}

          {userGroup.tasks.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-2">
              No tasks with work logs found for this user
            </div>
          )}
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${task.type === 'billable' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            <h3 className="text-lg font-semibold">{task.name}</h3>
            <Badge variant="outline" className={`text-xs ${task.type === 'billable' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
              {task.type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {task.status}
            </Badge>
          </div>
          <div className="text-xs text-gray-600">
            {task.assignedUserName ? `Assigned to: ${task.assignedUserName}` : 'Unassigned'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" title="Work Logs Count">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">{task.workLogs.length}</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-bold text-green-600" title="Billable Hours">{formatHours(task.billableHours)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="font-bold text-orange-600" title="Non-billable Hours">{formatHours(task.nonBillableHours)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span className="font-bold text-gray-800" title="Total Hours">{formatHours(task.totalHours)}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-1 h-7 w-7"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Work Log Entries */}
      {expanded && (
        <div className="space-y-3 border-t pt-3">
          <h4 className="text-sm font-semibold text-gray-700">Work Logs for this Task:</h4>
          {task.workLogs.length > 0 ? (
            task.workLogs.map((workLog) => (
              <div key={workLog.id} className="bg-white border rounded-lg p-3">
                {/* Work Log Header with DateTime and User */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span className="text-sm font-medium text-gray-800">
                        {format(new Date(workLog.createdAt || workLog.date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-green-600" />
                      <span className="text-sm font-medium text-gray-800">
                        {format(new Date(workLog.createdAt || workLog.date), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-3 w-3 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">
                        {workLog.userName || 'Unknown User'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600">{workLog.hours}</span>
                  </div>

                </div>

                {/* User Name */}


                {/* Description */}
                <div className="flex items-start gap-2">
                  <div className="text-xs text-gray-600 font-medium mt-0.5">Description:</div>
                  <div className="text-sm text-gray-800 flex-1">
                    {workLog.description || 'No description provided'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Clock className="mx-auto h-6 w-6 text-gray-400 mb-2" />
              <div className="text-sm">No work logs found for this task.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
