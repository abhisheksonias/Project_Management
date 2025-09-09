import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Edit, 
  MessageCircle, 
  Calendar, 
  User, 
  FileText, 
  Clock, 
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Eye,
  MoreHorizontal,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StatusHistory } from '@/components/ui/status-history';

interface Task {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  priority: string;
  estimate_hours: number;
  created_at: string;
  updated_at: string;
  assigned_user_id: string;
  project_id: string;
  comment: any;
  assigned_user?: {
    name: string;
    email: string;
  };
  project?: {
    name: string;
    status: string;
  };
}

interface WorkLog {
  id: string;
  hours: string;
  note: string | null;
  created_at: string;
  user_id: string;
  users: {
    name: string;
    email: string;
  };
}

interface TaskStats {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  lastWorked: string | null;
  workSessions: number;
  averageSessionTime: number;
  completionRate: number;
  workLogs: WorkLog[];
}

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
  onEdit: (task: Task) => void;
  onViewComments: (task: Task) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  onBack,
  onEdit,
  onViewComments,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    lastWorked: null,
    workSessions: 0,
    averageSessionTime: 0,
    completionRate: 0,
    workLogs: [],
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const { toast } = useToast();

  useEffect(() => {
    fetchTaskStats();
  }, [task.id]);


  const fetchTaskStats = async () => {
    try {
      setLoading(true);
      
      // Fetch work log data for this task with user information
      const { data: workLogsData, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          id,
          hours,
          note,
          created_at,
          user_id,
          users(name, email)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });

      if (workLogsError) {
        console.error('Error fetching work logs:', workLogsError);
        return;
      }

      const totalHours = workLogsData?.reduce((total, log) => {
        if (log.hours) {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          return total + hours;
        }
        return total;
      }, 0) || 0;

      const billableHours = workLogsData?.reduce((total, log) => {
        if (log.hours && task.type === 'billable') {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          return total + hours;
        }
        return total;
      }, 0) || 0;

      const nonBillableHours = totalHours - billableHours;
      const lastWorked = workLogsData?.[0]?.created_at || null;
      const workSessions = workLogsData?.length || 0;
      const averageSessionTime = workSessions > 0 ? totalHours / workSessions : 0;
      const completionRate = task.estimate_hours > 0 ? Math.min((totalHours / task.estimate_hours) * 100, 100) : 0;

      setTaskStats({
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
        lastWorked,
        workSessions,
        averageSessionTime: Math.round(averageSessionTime * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        workLogs: workLogsData || [],
      });
    } catch (error) {
      console.error('Error fetching task stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      case 'Review':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'feature':
        return 'default';
      case 'bug':
        return 'destructive';
      case 'documentation':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getWorkLogSummary = () => {
    const userWorkLogs = taskStats.workLogs.reduce((acc, log) => {
      const userId = log.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user: log.users,
          totalHours: 0,
          sessions: 0,
          lastWorked: log.created_at
        };
      }
      
      // Parse hours
      const [hoursStr, minutesStr] = log.hours.split(':');
      const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
      
      acc[userId].totalHours += hours;
      acc[userId].sessions += 1;
      
      // Update last worked if this is more recent
      if (new Date(log.created_at) > new Date(acc[userId].lastWorked)) {
        acc[userId].lastWorked = log.created_at;
      }
      
      return acc;
    }, {} as Record<string, { user: any; totalHours: number; sessions: number; lastWorked: string }>);

    return Object.values(userWorkLogs).map(summary => ({
      ...summary,
      totalHours: Math.round(summary.totalHours * 100) / 100
    }));
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{task.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getTypeBadgeVariant(task.type)} className="text-xs">
                {task.type}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                {task.priority || 'Not Set'}
              </Badge>
              <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
                {task.status}
              </Badge>
              {task.type === 'billable' && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Billable
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => onViewComments(task)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Comments
          </Button>
          
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{taskStats.totalHours}h</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{taskStats.workSessions}</div>
                <div className="text-sm text-muted-foreground">Work Sessions</div>
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
                <div className="text-2xl font-bold">{taskStats.completionRate}%</div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{taskStats.averageSessionTime}h</div>
                <div className="text-sm text-muted-foreground">Avg Session</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Overview Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Task Overview
          </CardTitle>
          <CardDescription>Complete task information and current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Task Status</div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(task.status)} className="text-sm">
                  {task.status}
                </Badge>
                {task.status === 'Completed' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {task.status === 'Blocked' && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Assigned To</div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {task.assigned_user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{task.assigned_user?.name || 'Unassigned'}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Project</div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{task.project?.name || 'Unknown Project'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="worklogs">Work Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Task Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {task.assigned_user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{task.assigned_user?.name || 'Unassigned'}</div>
                          <div className="text-sm text-muted-foreground">{task.assigned_user?.email}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Project</label>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{task.project?.name || 'Unknown Project'}</div>
                          <Badge variant="outline" className="text-xs">
                            {task.project?.status || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(task.updated_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Estimate</label>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{task.estimate_hours ? `${task.estimate_hours}h` : 'Not set'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Actual Hours</label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{taskStats.totalHours}h</span>
                      </div>
                    </div>
                  </div>
                  
                  {task.description && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{task.description}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Task Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Time Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium">Billable</span>
                          </div>
                          <span className="font-bold">{taskStats.billableHours}h</span>
                        </div>
                        <Progress 
                          value={taskStats.totalHours > 0 ? (taskStats.billableHours / taskStats.totalHours) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-sm font-medium">Non-billable</span>
                          </div>
                          <span className="font-bold">{taskStats.nonBillableHours}h</span>
                        </div>
                        <Progress 
                          value={taskStats.totalHours > 0 ? (taskStats.nonBillableHours / taskStats.totalHours) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      {taskStats.lastWorked && (
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-lg font-bold text-orange-600">
                            {format(new Date(taskStats.lastWorked), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">Last Worked</div>
                        </div>
                      )}
                      
                      {task.estimate_hours && taskStats.totalHours > 0 && (
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round((taskStats.totalHours / task.estimate_hours) * 100)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Estimate vs Actual</div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Work Logs Tab */}
        <TabsContent value="worklogs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Work Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Work Summary by User
                </CardTitle>
                <CardDescription>Total hours and sessions per user</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : getWorkLogSummary().length > 0 ? (
                  <div className="space-y-3">
                    {getWorkLogSummary().map((summary, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {summary.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{summary.user.name}</div>
                            <div className="text-sm text-muted-foreground">{summary.user.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{summary.totalHours}h</div>
                          <div className="text-sm text-muted-foreground">{summary.sessions} sessions</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No work logs found for this task.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Work Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Detailed Work Logs
                </CardTitle>
                <CardDescription>Chronological work log entries</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : taskStats.workLogs.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {taskStats.workLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {log.users.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{log.users.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{log.hours}</div>
                          {log.note && (
                            <div className="text-xs text-muted-foreground max-w-32 truncate">
                              {log.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No work logs found for this task.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Task Performance
                </CardTitle>
                <CardDescription>Key metrics and completion status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{task.estimate_hours || 0}h</div>
                      <div className="text-sm text-muted-foreground">Estimated</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{taskStats.totalHours}h</div>
                      <div className="text-sm text-muted-foreground">Actual</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Work Sessions</span>
                      <span className="font-bold">{taskStats.workSessions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Session</span>
                      <span className="font-bold">{taskStats.averageSessionTime}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Last Activity</span>
                      <span className="font-bold text-sm">
                        {taskStats.lastWorked ? format(new Date(taskStats.lastWorked), 'MMM dd') : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Time Distribution
                </CardTitle>
                <CardDescription>Billable vs non-billable hours breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">Billable Hours</span>
                      </div>
                      <span className="font-bold">{taskStats.billableHours}h</span>
                    </div>
                    <Progress 
                      value={taskStats.totalHours > 0 ? (taskStats.billableHours / taskStats.totalHours) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm font-medium">Non-billable Hours</span>
                      </div>
                      <span className="font-bold">{taskStats.nonBillableHours}h</span>
                    </div>
                    <Progress 
                      value={taskStats.totalHours > 0 ? (taskStats.nonBillableHours / taskStats.totalHours) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Hours</span>
                      <span className="font-bold text-lg">{taskStats.totalHours}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Billable Ratio</span>
                      <span className="font-bold">
                        {taskStats.totalHours > 0 ? Math.round((taskStats.billableHours / taskStats.totalHours) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <StatusHistory 
            entityId={task.id} 
            entityType="task" 
            title="Task Status History"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
