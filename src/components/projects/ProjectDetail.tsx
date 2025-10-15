import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Edit, 
  MessageSquare, 
  CheckSquare, 
  Calendar, 
  User, 
  FileText,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  DollarSign,
  Eye,
  MoreHorizontal,
  PieChart,
  Timer
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
import { StatusHistory } from '@/components/ui/status-history';

interface Project {
  id: string;
  name: string;
  type: string;
  category?: string;
  priority?: string;
  reference?: string;
  status: string;
  deadline: string | null;
  created_at: string;
  admin_id: string;
  description?: string;
  comments?: any;
  admin_name?: string;
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  teamMembers: number;
  completionRate: number;
  averageTaskDuration: number;
  lastActivity: string | null;
  workLogs: WorkLog[];
  tasks: Task[];
}

interface WorkLog {
  id: string;
  hours: string;
  note: string | null;
  created_at: string;
  user_id: string;
  task_id: string;
  users: {
    name: string;
    email: string;
  };
  tasks: {
    name: string;
  };
}

interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
  assigned_user_id: string | null;
  estimate_hours: number;
  created_at: string;
  assigned_user?: {
    name: string;
    email: string;
  };
}

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEdit: (project: Project) => void;
  onViewComments: (project: Project) => void;
  onViewTasks: (project: Project) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onEdit,
  onViewComments,
  onViewTasks,
}) => {
  const [loading, setLoading] = useState(false);
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    teamMembers: 0,
    completionRate: 0,
    averageTaskDuration: 0,
    lastActivity: null,
    workLogs: [],
    tasks: [],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectStats();
  }, [project.id]);

  const fetchProjectStats = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks with user information
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id, 
          name, 
          status, 
          priority, 
          assigned_user_id, 
          estimate_hours, 
          created_at,
          assigned_user:users(name, email)
        `)
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }

      const tasks = tasksData || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'Completed').length;
      const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
      const blockedTasks = tasks.filter(task => task.status === 'Blocked').length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Get unique team members
      const uniqueUsers = new Set(tasks.map(task => task.assigned_user_id).filter(Boolean));
      const teamMembers = uniqueUsers.size;

      // Fetch work logs with user and task information
      const { data: workLogsData, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          id,
          hours,
          note,
          created_at,
          user_id,
          task_id,
          users(name, email),
          tasks(name)
        `)
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (workLogsError) {
        console.error('Error fetching work logs:', workLogsError);
        return;
      }

      const workLogs = workLogsData || [];
      
      // Calculate total hours from work logs
      const totalHours = workLogs.reduce((total, log) => {
        if (log.hours) {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          return total + hours;
        }
        return total;
      }, 0);

      // Calculate billable vs non-billable hours
      const billableHours = workLogs.reduce((total, log) => {
        if (log.hours && project.type === 'billable') {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          return total + hours;
        }
        return total;
      }, 0);

      const nonBillableHours = totalHours - billableHours;

      // Calculate average task duration
      const totalEstimateHours = tasks.reduce((total, task) => total + (task.estimate_hours || 0), 0);
      const averageTaskDuration = totalTasks > 0 ? totalEstimateHours / totalTasks : 0;

      // Get last activity
      const lastActivity = workLogs.length > 0 ? workLogs[0].created_at : null;

      setProjectStats({
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
        teamMembers,
        completionRate: Math.round(completionRate * 100) / 100,
        averageTaskDuration: Math.round(averageTaskDuration * 100) / 100,
        lastActivity,
        workLogs,
        tasks,
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
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
      case 'On Hold':
        return 'destructive';
      case 'Client Approval':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTaskStatusBadgeVariant = (status: string) => {
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


  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getStatusBadgeVariant(project.status)} className="text-xs">
                {project.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {project.type}
              </Badge>
              {project.category && (
                <Badge variant="secondary" className="text-xs">
                  {project.category}
                </Badge>
              )}
              {project.priority && (
                <Badge 
                  variant={
                    project.priority === 'Critical' ? 'destructive' :
                    project.priority === 'High' ? 'default' :
                    project.priority === 'Medium' ? 'secondary' :
                    'outline'
                  } 
                  className="text-xs"
                >
                  {project.priority}
                </Badge>
              )}
              {project.reference && (
                <Badge variant="outline" className="text-xs">
                  {project.reference}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onEdit(project)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => onViewComments(project)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Comments
          </Button>
          <Button variant="outline" onClick={() => onViewTasks(project)}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{projectStats.totalTasks}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{projectStats.completedTasks}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{projectStats.completionRate}%</div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{projectStats.totalHours}h</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Overview Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Project Overview
          </CardTitle>
          <CardDescription>Complete project information and current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Project Status</div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(project.status)} className="text-sm">
                  {project.status}
                </Badge>
                {project.status === 'Completed' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {project.status === 'On Hold' && (
                  <Pause className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Project Admin</div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {project.admin_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{project.admin_name || 'Unknown'}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Total Tasks</div>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{projectStats.totalTasks} tasks</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="worklogs">Work Logs</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Project Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(project.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {project.deadline 
                            ? format(new Date(project.deadline), 'MMM dd, yyyy')
                            : 'Not set'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Project Type</label>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{project.type}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {project.category || 'Not set'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Priority</label>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            project.priority === 'Critical' ? 'destructive' :
                            project.priority === 'High' ? 'default' :
                            project.priority === 'Medium' ? 'secondary' :
                            project.priority === 'Low' ? 'outline' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {project.priority || 'Not set'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Reference</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{project.reference || 'Not set'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Last Activity</label>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {projectStats.lastActivity 
                            ? format(new Date(projectStats.lastActivity), 'MMM dd, yyyy')
                            : 'No activity'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {project.description && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{project.description}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Project Analytics */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Task Breakdown
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
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                          <span className="font-bold">{projectStats.completedTasks}</span>
                        </div>
                        <Progress 
                          value={projectStats.totalTasks > 0 ? (projectStats.completedTasks / projectStats.totalTasks) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-medium">In Progress</span>
                          </div>
                          <span className="font-bold">{projectStats.inProgressTasks}</span>
                        </div>
                        <Progress 
                          value={projectStats.totalTasks > 0 ? (projectStats.inProgressTasks / projectStats.totalTasks) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm font-medium">Blocked</span>
                          </div>
                          <span className="font-bold">{projectStats.blockedTasks}</span>
                        </div>
                        <Progress 
                          value={projectStats.totalTasks > 0 ? (projectStats.blockedTasks / projectStats.totalTasks) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Average Task Duration</span>
                          <span className="font-bold">{projectStats.averageTaskDuration}h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Hours</span>
                          <span className="font-bold text-lg">{projectStats.totalHours}h</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Project Tasks
              </CardTitle>
              <CardDescription>All tasks in this project with their current status</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : projectStats.tasks.length > 0 ? (
                <div className="space-y-3">
                  {projectStats.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-medium">{task.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getTaskStatusBadgeVariant(task.status)} className="text-xs">
                              {task.status}
                            </Badge>
                            <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                              {task.priority || 'Not Set'}
                            </Badge>
                            {task.estimate_hours && (
                              <Badge variant="outline" className="text-xs">
                                {task.estimate_hours}h
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {task.assigned_user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {task.assigned_user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{task.assigned_user.name}</div>
                              <div className="text-xs text-muted-foreground">{task.assigned_user.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks found for this project.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Work Logs Tab */}
        <TabsContent value="worklogs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work Logs
              </CardTitle>
              <CardDescription>Recent work activity on this project</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : projectStats.workLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {projectStats.workLogs.slice(0, 20).map((log) => (
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
                            {log.tasks.name} • {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
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
                  <p>No work logs found for this project.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <StatusHistory 
            entityId={project.id} 
            entityType="project" 
            title="Project Status History"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
