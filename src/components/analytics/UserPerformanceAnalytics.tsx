// import React, { useState, useEffect } from 'react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Calendar as CalendarComponent } from '@/components/ui/calendar';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { 
//   Calendar, 
//   Clock, 
//   TrendingUp, 
//   BarChart3, 
//   PieChart, 
//   Activity,
//   Target,
//   DollarSign,
//   Zap,
//   Award,
//   AlertCircle,
//   CheckCircle2,
//   CheckSquare,
//   FolderOpen,
//   User,
//   Eye,
//   ChevronDown,
//   ChevronUp,
//   Filter,
//   X,
//   CalendarDays,
//   ArrowLeft,
//   ArrowRight,
//   Timer,
//   TrendingDown
// } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client';
// import { useToast } from '@/hooks/use-toast';
// import { useAuth } from '@/contexts/AuthContext';
// import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

// interface UserPerformanceData {
//   totalHours: number;
//   billableHours: number;
//   nonBillableHours: number;
//   averageDailyHours: number;
//   totalTasks: number;
//   completedTasks: number;
//   efficiency: number;
//   projectCount: number;
//   taskBreakdown: TaskBreakdown[];
//   projectBreakdown: ProjectBreakdown[];
//   dailyPerformance: DailyPerformance[];
//   weeklyTrend: WeeklyTrend[];
//   monthlyTrend: MonthlyTrend[];
// }

// interface TaskBreakdown {
//   id: string;
//   name: string;
//   status: string;
//   type: string;
//   projectName: string;
//   totalHours: number;
//   billableHours: number;
//   workLogCount: number;
//   completionDate?: string;
// }

// interface ProjectBreakdown {
//   id: string;
//   name: string;
//   status: string;
//   totalHours: number;
//   billableHours: number;
//   taskCount: number;
//   completedTasks: number;
//   progress: number;
//   lastActivity: string;
// }

// interface DailyPerformance {
//   date: string;
//   totalHours: number;
//   billableHours: number;
//   nonBillableHours: number;
//   taskCount: number;
//   completedTasks: number;
//   workLogs: WorkLog[];
// }

// interface WorkLog {
//   id: string;
//   hours: string;
//   note: string | null;
//   projectName: string;
//   taskName: string | null;
//   isBillable: boolean;
//   createdAt: string;
// }

// interface WeeklyTrend {
//   week: string;
//   totalHours: number;
//   billableHours: number;
//   taskCount: number;
//   completedTasks: number;
//   efficiency: number;
// }

// interface MonthlyTrend {
//   month: string;
//   totalHours: number;
//   billableHours: number;
//   taskCount: number;
//   completedTasks: number;
//   efficiency: number;
// }

// interface CalendarDay {
//   date: Date;
//   totalHours: number;
//   billableHours: number;
//   nonBillableHours: number;
//   taskCount: number;
//   completedTasks: number;
//   workLogs: WorkLog[];
// }

// export const UserPerformanceAnalytics: React.FC = () => {
//   const { profile } = useAuth();
//   const [performanceData, setPerformanceData] = useState<UserPerformanceData>({
//     totalHours: 0,
//     billableHours: 0,
//     nonBillableHours: 0,
//     averageDailyHours: 0,
//     totalTasks: 0,
//     completedTasks: 0,
//     efficiency: 0,
//     projectCount: 0,
//     taskBreakdown: [],
//     projectBreakdown: [],
//     dailyPerformance: [],
//     weeklyTrend: [],
//     monthlyTrend: []
//   });
//   const [loading, setLoading] = useState(true);
//   const [currentMonth, setCurrentMonth] = useState(new Date());
//   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
//   const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
//     from: null,
//     to: null
//   });
//   const [timeRange, setTimeRange] = useState('month');
//   const { toast } = useToast();

//   const fetchPerformanceData = async () => {
//     if (!profile?.id) return;
    
//     try {
//       setLoading(true);
      
//       // Calculate date range based on selection
//       const now = new Date();
//       let startDate = new Date();
//       let endDate = new Date();
      
//       switch (timeRange) {
//         case 'day':
//           // Today only - from start of today to end of today
//           startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
//           endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
//           break;
//         case 'week':
//           startDate = startOfWeek(now);
//           endDate = endOfWeek(now);
//           break;
//         case 'month':
//           startDate = startOfMonth(now);
//           endDate = endOfMonth(now);
//           break;
//         case 'quarter':
//           startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
//           endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
//           break;
//         case 'year':
//           startDate = new Date(now.getFullYear(), 0, 1);
//           endDate = new Date(now.getFullYear(), 11, 31);
//           break;
//         default:
//           startDate = startOfMonth(now);
//           endDate = endOfMonth(now);
//       }

//       // Use custom date range if provided
//       if (dateRange.from && dateRange.to) {
//         startDate = startOfDay(dateRange.from);
//         endDate = endOfDay(dateRange.to);
//       }

//       // Fetch work logs with related data
//       const { data: workLogs, error: workLogsError } = await supabase
//         .from('work_logs')
//         .select(`
//           *,
//           projects(name, status),
//           tasks(name, status, type)
//         `)
//         .eq('user_id', profile.id)
//         .gte('created_at', startDate.toISOString())
//         .lte('created_at', endDate.toISOString())
//         .order('created_at', { ascending: false });

//       if (workLogsError) throw workLogsError;

//       // Fetch user's tasks
//       const { data: tasks, error: tasksError } = await supabase
//         .from('tasks')
//         .select(`
//           *,
//           projects(name, status)
//         `)
//         .eq('assigned_user_id', profile.id);

//       if (tasksError) throw tasksError;

//       // Process data
//       const totalHours = workLogs?.reduce((total, log) => {
//         if (!log.hours) return total;
//         const [hoursStr, minutesStr] = log.hours.split(':');
//         return total + parseInt(hoursStr) + (parseInt(minutesStr) / 60);
//       }, 0) || 0;

//       const billableHours = workLogs?.reduce((total, log) => {
//         if (!log.hours || log.tasks?.type !== 'billable') return total;
//         const [hoursStr, minutesStr] = log.hours.split(':');
//         return total + parseInt(hoursStr) + (parseInt(minutesStr) / 60);
//       }, 0) || 0;

//       const nonBillableHours = totalHours - billableHours;
//       const completedTasks = tasks?.filter(task => task.status === 'Completed').length || 0;
//       const efficiency = tasks && tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
//       const projectCount = new Set(workLogs?.map(log => log.project_id)).size || 0;

//       // Calculate average daily hours
//       const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
//       const averageDailyHours = daysDiff > 0 ? totalHours / daysDiff : 0;

//       // Process task breakdown
//       const taskMap = new Map<string, TaskBreakdown>();
//       workLogs?.forEach(log => {
//         if (!log.task_id || !log.tasks) return;
        
//         const taskId = log.task_id;
//         if (!taskMap.has(taskId)) {
//           taskMap.set(taskId, {
//             id: taskId,
//             name: log.tasks.name,
//             status: log.tasks.status,
//             type: log.tasks.type,
//             projectName: log.projects?.name || 'Unknown Project',
//             totalHours: 0,
//             billableHours: 0,
//             workLogCount: 0
//           });
//         }
        
//         const task = taskMap.get(taskId)!;
//         if (log.hours) {
//           const [hoursStr, minutesStr] = log.hours.split(':');
//           const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
//           task.totalHours += hours;
          
//           if (log.tasks.type === 'billable') {
//             task.billableHours += hours;
//           }
//         }
//         task.workLogCount += 1;
//       });

//       // Add completion dates for completed tasks
//       tasks?.forEach(task => {
//         if (task.status === 'Completed' && taskMap.has(task.id)) {
//           taskMap.get(task.id)!.completionDate = task.updated_at;
//         }
//       });

//       const taskBreakdown = Array.from(taskMap.values()).sort((a, b) => b.totalHours - a.totalHours);

//       // Process project breakdown
//       const projectMap = new Map<string, ProjectBreakdown>();
//       workLogs?.forEach(log => {
//         if (!log.project_id || !log.projects) return;
        
//         const projectId = log.project_id;
//         if (!projectMap.has(projectId)) {
//           projectMap.set(projectId, {
//             id: projectId,
//             name: log.projects.name,
//             status: log.projects.status,
//             totalHours: 0,
//             billableHours: 0,
//             taskCount: 0,
//             completedTasks: 0,
//             progress: 0,
//             lastActivity: log.created_at
//           });
//         }
        
//         const project = projectMap.get(projectId)!;
//         if (log.hours) {
//           const [hoursStr, minutesStr] = log.hours.split(':');
//           const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
//           project.totalHours += hours;
          
//           if (log.tasks?.type === 'billable') {
//             project.billableHours += hours;
//           }
//         }
//         project.lastActivity = log.created_at;
//       });

//       // Add task counts to projects
//       projectMap.forEach(project => {
//         const projectTasks = tasks?.filter(task => task.project_id === project.id) || [];
//         project.taskCount = projectTasks.length;
//         project.completedTasks = projectTasks.filter(task => task.status === 'Completed').length;
//         project.progress = projectTasks.length > 0 ? (project.completedTasks / projectTasks.length) * 100 : 0;
//       });

//       const projectBreakdown = Array.from(projectMap.values()).sort((a, b) => b.totalHours - a.totalHours);

//       // Process daily performance
//       const dailyMap = new Map<string, DailyPerformance>();
//       workLogs?.forEach(log => {
//         const date = format(new Date(log.created_at), 'yyyy-MM-dd');
//         if (!dailyMap.has(date)) {
//           dailyMap.set(date, {
//             date,
//             totalHours: 0,
//             billableHours: 0,
//             nonBillableHours: 0,
//             taskCount: 0,
//             completedTasks: 0,
//             workLogs: []
//           });
//         }
        
//         const day = dailyMap.get(date)!;
//         if (log.hours) {
//           const [hoursStr, minutesStr] = log.hours.split(':');
//           const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
//           day.totalHours += hours;
          
//           if (log.tasks?.type === 'billable') {
//             day.billableHours += hours;
//           } else {
//             day.nonBillableHours += hours;
//           }
//         }
        
//         day.workLogs.push({
//           id: log.id,
//           hours: log.hours || '0:00',
//           note: log.note,
//           projectName: log.projects?.name || 'Unknown Project',
//           taskName: log.tasks?.name || null,
//           isBillable: log.tasks?.type === 'billable',
//           createdAt: log.created_at
//         });
//       });

//       const dailyPerformance = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

//       // Generate calendar data
//       const calendarDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
//       const calendarData: CalendarDay[] = calendarDays.map(date => {
//         const dateStr = format(date, 'yyyy-MM-dd');
//         const dayData = dailyMap.get(dateStr);
        
//         return {
//           date,
//           totalHours: dayData?.totalHours || 0,
//           billableHours: dayData?.billableHours || 0,
//           nonBillableHours: dayData?.nonBillableHours || 0,
//           taskCount: dayData?.taskCount || 0,
//           completedTasks: dayData?.completedTasks || 0,
//           workLogs: dayData?.workLogs || []
//         };
//       });

//       setPerformanceData({
//         totalHours,
//         billableHours,
//         nonBillableHours,
//         averageDailyHours,
//         totalTasks: tasks?.length || 0,
//         completedTasks,
//         efficiency,
//         projectCount,
//         taskBreakdown,
//         projectBreakdown,
//         dailyPerformance,
//         weeklyTrend: [], // TODO: Implement weekly trend calculation
//         monthlyTrend: [] // TODO: Implement monthly trend calculation
//       });

//     } catch (error) {
//       console.error('Error fetching performance data:', error);
//       toast({
//         title: 'Error',
//         description: 'Failed to load performance data',
//         variant: 'destructive',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (profile?.id) {
//       fetchPerformanceData();
//     }
//   }, [profile?.id, timeRange, dateRange, currentMonth]);

//   const getSelectedDateWorkLogs = () => {
//     if (!selectedDate) return [];
//     const dateStr = format(selectedDate, 'yyyy-MM-dd');
//     return performanceData.dailyPerformance.find(day => day.date === dateStr)?.workLogs || [];
//   };

//   const getSelectedDateTotalHours = () => {
//     if (!selectedDate) return { billable: 0, nonBillable: 0, total: 0 };
//     const dateStr = format(selectedDate, 'yyyy-MM-dd');
//     const dayData = performanceData.dailyPerformance.find(day => day.date === dateStr);
//     return {
//       billable: dayData?.billableHours || 0,
//       nonBillable: dayData?.nonBillableHours || 0,
//       total: dayData?.totalHours || 0
//     };
//   };

//   const clearDateRange = () => {
//     setDateRange({ from: null, to: null });
//   };

//   const getCalendarDayClass = (day: CalendarDay) => {
//     if (day.totalHours === 0) return 'text-muted-foreground';
//     if (day.billableHours > day.nonBillableHours) return 'text-green-600 font-semibold';
//     if (day.nonBillableHours > day.billableHours) return 'text-orange-600 font-semibold';
//     return 'text-blue-600 font-semibold';
//   };

//   const getCalendarDayBackground = (day: CalendarDay) => {
//     if (day.totalHours === 0) return '';
//     const intensity = Math.min(day.totalHours / 8, 1);
//     if (day.billableHours > day.nonBillableHours) {
//       return `bg-green-100 hover:bg-green-200`;
//     } else if (day.nonBillableHours > day.billableHours) {
//       return `bg-orange-100 hover:bg-orange-200`;
//     }
//     return `bg-blue-100 hover:bg-blue-200`;
//   };

//   if (loading) {
//     return (
//       <div className="space-y-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//           {[1, 2, 3, 4].map((i) => (
//             <Card key={i}>
//               <CardContent className="p-6">
//                 <div className="animate-pulse">
//                   <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
//                   <div className="h-8 bg-gray-200 rounded w-1/2"></div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Performance Summary Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-blue-100 rounded-lg">
//                 <Clock className="h-5 w-5 text-blue-600" />
//               </div>
//               <div>
//                 <div className="text-2xl font-bold">{performanceData.totalHours.toFixed(1)}h</div>
//                 <div className="text-sm text-muted-foreground">Total Hours</div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-green-100 rounded-lg">
//                 <DollarSign className="h-5 w-5 text-green-600" />
//               </div>
//               <div>
//                 <div className="text-2xl font-bold text-green-600">{performanceData.billableHours.toFixed(1)}h</div>
//                 <div className="text-sm text-muted-foreground">Billable</div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-purple-100 rounded-lg">
//                 <Target className="h-5 w-5 text-purple-600" />
//               </div>
//               <div>
//                 <div className="text-2xl font-bold">{performanceData.efficiency.toFixed(0)}%</div>
//                 <div className="text-sm text-muted-foreground">Efficiency</div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-orange-100 rounded-lg">
//                 <TrendingUp className="h-5 w-5 text-orange-600" />
//               </div>
//               <div>
//                 <div className="text-2xl font-bold">{performanceData.averageDailyHours.toFixed(1)}h</div>
//                 <div className="text-sm text-muted-foreground">Daily Average</div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Date Range Filter */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Calendar className="h-5 w-5" />
//             Date Range Filter
//           </CardTitle>
//           <CardDescription>Filter your performance data by time period</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="flex items-center gap-4">
//             <Select value={timeRange} onValueChange={setTimeRange}>
//               <SelectTrigger className="w-40">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="week">This Week</SelectItem>
//                 <SelectItem value="month">This Month</SelectItem>
//                 <SelectItem value="quarter">This Quarter</SelectItem>
//                 <SelectItem value="year">This Year</SelectItem>
//               </SelectContent>
//             </Select>

//             <Popover>
//               <PopoverTrigger asChild>
//                 <Button variant="outline" className="w-48 justify-start text-left font-normal">
//                   <CalendarDays className="mr-2 h-4 w-4" />
//                   {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Custom start date'}
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-auto p-0">
//                 <CalendarComponent
//                   mode="single"
//                   selected={dateRange.from}
//                   onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
//                   initialFocus
//                 />
//               </PopoverContent>
//             </Popover>

//             <Popover>
//               <PopoverTrigger asChild>
//                 <Button variant="outline" className="w-48 justify-start text-left font-normal">
//                   <CalendarDays className="mr-2 h-4 w-4" />
//                   {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Custom end date'}
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-auto p-0">
//                 <CalendarComponent
//                   mode="single"
//                   selected={dateRange.to}
//                   onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
//                   initialFocus
//                 />
//               </PopoverContent>
//             </Popover>

//             <Button variant="outline" onClick={clearDateRange}>
//               <X className="mr-2 h-4 w-4" />
//               Clear
//             </Button>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Main Analytics Tabs */}
//       <Tabs defaultValue="overview" className="space-y-4">
//         <TabsList className="grid w-full grid-cols-4">
//           <TabsTrigger value="overview">Overview</TabsTrigger>
//           <TabsTrigger value="calendar">Calendar</TabsTrigger>
//           <TabsTrigger value="tasks">Task Analytics</TabsTrigger>
//           <TabsTrigger value="projects">Project Analytics</TabsTrigger>
//         </TabsList>

//         {/* Overview Tab */}
//         <TabsContent value="overview" className="space-y-6">
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {/* Billable vs Non-billable Hours */}
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <PieChart className="h-5 w-5" />
//                   Time Distribution
//                 </CardTitle>
//                 <CardDescription>Billable vs non-billable hours breakdown</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center gap-3">
//                       <div className="w-4 h-4 rounded-full bg-green-500"></div>
//                       <span className="font-medium">Billable Hours</span>
//                     </div>
//                     <div className="text-right">
//                       <div className="font-bold">{performanceData.billableHours.toFixed(1)}h</div>
//                       <div className="text-sm text-muted-foreground">
//                         {performanceData.totalHours > 0 ? Math.round((performanceData.billableHours / performanceData.totalHours) * 100) : 0}%
//                       </div>
//                     </div>
//                   </div>
//                   <Progress 
//                     value={performanceData.totalHours > 0 ? (performanceData.billableHours / performanceData.totalHours) * 100 : 0} 
//                     className="h-2"
//                   />
                  
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center gap-3">
//                       <div className="w-4 h-4 rounded-full bg-orange-500"></div>
//                       <span className="font-medium">Non-billable Hours</span>
//                     </div>
//                     <div className="text-right">
//                       <div className="font-bold">{performanceData.nonBillableHours.toFixed(1)}h</div>
//                       <div className="text-sm text-muted-foreground">
//                         {performanceData.totalHours > 0 ? Math.round((performanceData.nonBillableHours / performanceData.totalHours) * 100) : 0}%
//                       </div>
//                     </div>
//                   </div>
//                   <Progress 
//                     value={performanceData.totalHours > 0 ? (performanceData.nonBillableHours / performanceData.totalHours) * 100 : 0} 
//                     className="h-2"
//                   />
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Task Completion Summary */}
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <CheckCircle2 className="h-5 w-5" />
//                   Task Completion
//                 </CardTitle>
//                 <CardDescription>Your task completion performance</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div className="text-center">
//                     <div className="text-3xl font-bold text-primary">{performanceData.completedTasks}</div>
//                     <div className="text-sm text-muted-foreground">Completed Tasks</div>
//                   </div>
                  
//                   <div className="space-y-2">
//                     <div className="flex justify-between text-sm">
//                       <span>Total Tasks</span>
//                       <span className="font-medium">{performanceData.totalTasks}</span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span>Completion Rate</span>
//                       <span className="font-medium">{performanceData.efficiency.toFixed(0)}%</span>
//                     </div>
//                     <Progress value={performanceData.efficiency} className="h-2" />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           {/* Recent Daily Performance */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <BarChart3 className="h-5 w-5" />
//                 Recent Daily Performance
//               </CardTitle>
//               <CardDescription>Your daily work patterns</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-3">
//                 {performanceData.dailyPerformance.slice(0, 7).map((day) => (
//                   <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
//                     <div className="flex items-center gap-3">
//                       <div className="text-sm font-medium w-20">
//                         {format(new Date(day.date), 'MMM dd')}
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <Badge variant="outline" className="text-xs">
//                           {day.workLogs.length} logs
//                         </Badge>
//                         {day.billableHours > 0 && (
//                           <Badge variant="default" className="text-xs">
//                             {day.billableHours.toFixed(1)}h billable
//                           </Badge>
//                         )}
//                       </div>
//                     </div>
//                     <div className="text-right">
//                       <div className="font-bold">{day.totalHours.toFixed(1)}h</div>
//                       <div className="text-xs text-muted-foreground">
//                         {day.completedTasks} tasks completed
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Calendar Tab */}
//         <TabsContent value="calendar" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Calendar className="h-5 w-5" />
//                 Calendar View
//               </CardTitle>
//               <CardDescription>Daily breakdown of your work performance</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {/* Calendar Navigation */}
//                 <div className="flex items-center justify-between">
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
//                   >
//                     <ArrowLeft className="h-4 w-4" />
//                   </Button>
//                   <h3 className="text-lg font-semibold">
//                     {format(currentMonth, 'MMMM yyyy')}
//                   </h3>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
//                   >
//                     <ArrowRight className="h-4 w-4" />
//                   </Button>
//                 </div>

//                 {/* Calendar Grid */}
//                 <div className="grid grid-cols-7 gap-1">
//                   {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
//                     <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
//                       {day}
//                     </div>
//                   ))}
                  
//                   {eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map((date, index) => {
//                     const dayData = performanceData.dailyPerformance.find(day => 
//                       isSameDay(new Date(day.date), date)
//                     );
                    
//                     const calendarDay: CalendarDay = {
//                       date,
//                       totalHours: dayData?.totalHours || 0,
//                       billableHours: dayData?.billableHours || 0,
//                       nonBillableHours: dayData?.nonBillableHours || 0,
//                       taskCount: dayData?.taskCount || 0,
//                       completedTasks: dayData?.completedTasks || 0,
//                       workLogs: dayData?.workLogs || []
//                     };
                    
//                     return (
//                       <div
//                         key={index}
//                         className={`
//                           p-2 min-h-[60px] border rounded cursor-pointer transition-colors
//                           ${getCalendarDayBackground(calendarDay)}
//                           ${selectedDate && isSameDay(date, selectedDate) ? 'ring-2 ring-primary' : ''}
//                         `}
//                         onClick={() => setSelectedDate(date)}
//                       >
//                         <div className={`text-sm ${getCalendarDayClass(calendarDay)}`}>
//                           {format(date, 'd')}
//                         </div>
//                         {calendarDay.totalHours > 0 && (
//                           <div className="text-xs mt-1 space-y-1">
//                             {calendarDay.billableHours > 0 && (
//                               <div className="text-green-600 font-semibold">
//                                 {calendarDay.billableHours.toFixed(1)}h
//                               </div>
//                             )}
//                             {calendarDay.nonBillableHours > 0 && (
//                               <div className="text-orange-600 font-semibold">
//                                 {calendarDay.nonBillableHours.toFixed(1)}h
//                               </div>
//                             )}
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Daily Details */}
//           {selectedDate && (
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <CalendarDays className="h-5 w-5" />
//                   Daily Details - {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between">
//                     <h3 className="text-lg font-semibold">Work Summary</h3>
//                     <div className="text-right">
//                       <div className="text-2xl font-bold">{getSelectedDateTotalHours().total.toFixed(1)}h</div>
//                       <div className="text-sm text-muted-foreground">
//                         {getSelectedDateTotalHours().billable.toFixed(1)}h billable, {getSelectedDateTotalHours().nonBillable.toFixed(1)}h non-billable
//                       </div>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-2 gap-4">
//                     <div className="text-center p-3 bg-green-50 rounded">
//                       <div className="text-xl font-bold text-green-600">
//                         {getSelectedDateTotalHours().billable.toFixed(1)}h
//                       </div>
//                       <div className="text-sm text-muted-foreground">Billable Hours</div>
//                     </div>
//                     <div className="text-center p-3 bg-orange-50 rounded">
//                       <div className="text-xl font-bold text-orange-600">
//                         {getSelectedDateTotalHours().nonBillable.toFixed(1)}h
//                       </div>
//                       <div className="text-sm text-muted-foreground">Non-billable Hours</div>
//                     </div>
//                   </div>

//                   {getSelectedDateWorkLogs().length > 0 ? (
//                     <div className="space-y-3">
//                       <h4 className="font-semibold">Work Logs for this day:</h4>
//                       {getSelectedDateWorkLogs().map((log) => (
//                         <div key={log.id} className="p-3 border rounded-lg">
//                           <div className="flex items-center justify-between mb-2">
//                             <div className="flex items-center gap-2">
//                               <Badge variant={log.isBillable ? 'default' : 'outline'}>
//                                 {log.isBillable ? 'Billable' : 'Non-billable'}
//                               </Badge>
//                               <span className="font-semibold">{log.hours}</span>
//                             </div>
//                             <span className="text-sm text-muted-foreground">
//                               {format(new Date(log.createdAt), 'HH:mm')}
//                             </span>
//                           </div>
//                           <div className="text-sm">
//                             <div className="font-medium">{log.projectName}</div>
//                             {log.taskName && (
//                               <div className="text-muted-foreground">Task: {log.taskName}</div>
//                             )}
//                             {log.note && (
//                               <div className="text-muted-foreground mt-1 italic">"{log.note}"</div>
//                             )}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="text-center py-8 text-muted-foreground">
//                       No work logs found for this date.
//                     </div>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>
//           )}
//         </TabsContent>

//         {/* Task Analytics Tab */}
//         <TabsContent value="tasks" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <CheckSquare className="h-5 w-5" />
//                 Task Performance Analytics
//               </CardTitle>
//               <CardDescription>Detailed breakdown of your task performance</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {performanceData.taskBreakdown.map((task) => (
//                   <div key={task.id} className="p-4 border rounded-lg">
//                     <div className="flex items-center justify-between mb-3">
//                       <div className="flex-1">
//                         <h4 className="font-semibold text-lg">{task.name}</h4>
//                         <div className="flex items-center gap-2 mt-1">
//                           <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>
//                             {task.status}
//                           </Badge>
//                           <Badge variant={task.type === 'billable' ? 'default' : 'outline'}>
//                             {task.type}
//                           </Badge>
//                           <Badge variant="outline" className="text-xs">
//                             {task.projectName}
//                           </Badge>
//                         </div>
//                       </div>
//                       <div className="text-right">
//                         <div className="text-lg font-bold">{task.totalHours.toFixed(1)}h</div>
//                         <div className="text-sm text-muted-foreground">
//                           {task.workLogCount} work logs
//                         </div>
//                       </div>
//                     </div>
                    
//                     <div className="grid grid-cols-3 gap-4">
//                       <div className="text-center p-2 bg-green-50 rounded">
//                         <div className="font-semibold text-green-600">{task.billableHours.toFixed(1)}h</div>
//                         <div className="text-xs text-muted-foreground">Billable</div>
//                       </div>
//                       <div className="text-center p-2 bg-orange-50 rounded">
//                         <div className="font-semibold text-orange-600">{(task.totalHours - task.billableHours).toFixed(1)}h</div>
//                         <div className="text-xs text-muted-foreground">Non-billable</div>
//                       </div>
//                       <div className="text-center p-2 bg-blue-50 rounded">
//                         <div className="font-semibold text-blue-600">{task.workLogCount}</div>
//                         <div className="text-xs text-muted-foreground">Work Logs</div>
//                       </div>
//                     </div>

//                     {task.completionDate && (
//                       <div className="mt-3 pt-3 border-t">
//                         <div className="text-sm text-muted-foreground">
//                           Completed on {format(new Date(task.completionDate), 'MMM dd, yyyy')}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 ))}
                
//                 {performanceData.taskBreakdown.length === 0 && (
//                   <div className="text-center py-8 text-muted-foreground">
//                     No task data found for the selected time period.
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Project Analytics Tab */}
//         <TabsContent value="projects" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <FolderOpen className="h-5 w-5" />
//                 Project Performance Analytics
//               </CardTitle>
//               <CardDescription>Detailed breakdown of your project contributions</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {performanceData.projectBreakdown.map((project) => (
//                   <div key={project.id} className="p-4 border rounded-lg">
//                     <div className="flex items-center justify-between mb-3">
//                       <div className="flex-1">
//                         <h4 className="font-semibold text-lg">{project.name}</h4>
//                         <div className="flex items-center gap-2 mt-1">
//                           <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>
//                             {project.status}
//                           </Badge>
//                           <Badge variant="outline" className="text-xs">
//                             {project.taskCount} tasks
//                           </Badge>
//                           <Badge variant="outline" className="text-xs">
//                             {project.completedTasks} completed
//                           </Badge>
//                         </div>
//                       </div>
//                       <div className="text-right">
//                         <div className="text-lg font-bold">{project.totalHours.toFixed(1)}h</div>
//                         <div className="text-sm text-muted-foreground">
//                           {project.billableHours.toFixed(1)}h billable
//                         </div>
//                       </div>
//                     </div>
                    
//                     <div className="space-y-2">
//                       <div className="flex justify-between text-sm">
//                         <span>Project Progress</span>
//                         <span>{project.progress.toFixed(0)}%</span>
//                       </div>
//                       <Progress value={project.progress} className="h-2" />
//                     </div>

//                     <div className="grid grid-cols-2 gap-4 mt-3">
//                       <div className="text-center p-2 bg-green-50 rounded">
//                         <div className="font-semibold text-green-600">{project.billableHours.toFixed(1)}h</div>
//                         <div className="text-xs text-muted-foreground">Billable</div>
//                       </div>
//                       <div className="text-center p-2 bg-orange-50 rounded">
//                         <div className="font-semibold text-orange-600">{(project.totalHours - project.billableHours).toFixed(1)}h</div>
//                         <div className="text-xs text-muted-foreground">Non-billable</div>
//                       </div>
//                     </div>

//                     <div className="mt-3 pt-3 border-t">
//                       <div className="text-sm text-muted-foreground">
//                         Last activity: {format(new Date(project.lastActivity), 'MMM dd, yyyy')}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
                
//                 {performanceData.projectBreakdown.length === 0 && (
//                   <div className="text-center py-8 text-muted-foreground">
//                     No project data found for the selected time period.
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// };
