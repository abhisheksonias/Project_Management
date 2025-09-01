import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Users, Target, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectTimeAnalyticsProps {
  timeRange: string;
}

interface ProjectData {
  id: string;
  name: string;
  type: string;
  status: string;
  totalHours: number;
  userCount: number;
  taskCount: number;
  completedTasks: number;
  estimatedHours: number;
  deadline: string | null;
  efficiency: number;
  userBreakdown: UserBreakdown[];
  taskBreakdown: TaskBreakdown[];
}

interface UserBreakdown {
  userId: string;
  userName: string;
  hours: number;
  tasks: number;
  completedTasks: number;
  efficiency: number;
}

interface TaskBreakdown {
  taskId: string;
  taskName: string;
  status: string;
  assignedUser: string;
  estimatedHours: number;
  actualHours: number;
  efficiency: number;
}

export const ProjectTimeAnalytics: React.FC<ProjectTimeAnalyticsProps> = ({ timeRange }) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('hours');
  const { toast } = useToast();

  const fetchProjectAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get date range based on selection
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      // Fetch work logs for time range
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users(name),
          projects(name, type, status, deadline),
          tasks(name, status, estimate_hours, assigned_user_id)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', now.toISOString());

      if (workLogsError) {
        console.error('Error fetching work logs:', workLogsError);
        throw workLogsError;
      }

      // Fetch all tasks for completion rate calculation
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      // Process project data
      const projectMap = new Map<string, ProjectData>();
      
      // Initialize all projects
      projectsData?.forEach(project => {
        projectMap.set(project.id, {
          id: project.id,
          name: project.name,
          type: project.type,
          status: project.status || 'Unknown',
          totalHours: 0,
          userCount: 0,
          taskCount: 0,
          completedTasks: 0,
          estimatedHours: 0,
          deadline: project.deadline,
          efficiency: 0,
          userBreakdown: [],
          taskBreakdown: [],
        });
      });

      // Process work logs
      const userMap = new Map<string, Map<string, { hours: number; tasks: Set<string>; completedTasks: number }>>();
      const taskMap = new Map<string, { hours: number; estimatedHours: number; status: string; assignedUser: string }>();

      workLogs?.forEach(log => {
        if (!log.project_id) return;

        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        // Update project total hours
        const project = projectMap.get(log.project_id);
        if (project) {
          project.totalHours += hours;
        }

        // Update user breakdown
        if (log.user_id) {
          if (!userMap.has(log.project_id)) {
            userMap.set(log.project_id, new Map());
          }
          const projectUsers = userMap.get(log.project_id)!;
          
          if (!projectUsers.has(log.user_id)) {
            projectUsers.set(log.user_id, { hours: 0, tasks: new Set(), completedTasks: 0 });
          }
          
          const userData = projectUsers.get(log.user_id)!;
          userData.hours += hours;
          if (log.task_id) userData.tasks.add(log.task_id);
          if (log.tasks?.status === 'Completed') userData.completedTasks++;
        }

        // Update task breakdown
        if (log.task_id) {
          if (!taskMap.has(log.task_id)) {
            taskMap.set(log.task_id, { 
              hours: 0, 
              estimatedHours: log.tasks?.estimate_hours || 0,
              status: log.tasks?.status || 'Unknown',
              assignedUser: log.tasks?.assigned_user_id || 'Unassigned'
            });
          }
          const taskData = taskMap.get(log.task_id)!;
          taskData.hours += hours;
        }
      });

      // Calculate project metrics
      projectsData?.forEach(project => {
        const projectData = projectMap.get(project.id)!;
        
        // Get project tasks
        const projectTasks = allTasks?.filter(task => task.project_id === project.id) || [];
        projectData.taskCount = projectTasks.length;
        projectData.completedTasks = projectTasks.filter(task => task.status === 'Completed').length;
        
        // Calculate estimated hours
        projectData.estimatedHours = projectTasks.reduce((sum, task) => sum + (task.estimate_hours || 0), 0);
        
        // Calculate efficiency (actual vs estimated)
        projectData.efficiency = projectData.estimatedHours > 0 
          ? (projectData.totalHours / projectData.estimatedHours) * 100 
          : 0;

        // Get user breakdown
        const projectUsers = userMap.get(project.id) || new Map();
        projectData.userCount = projectUsers.size;
        
        projectData.userBreakdown = Array.from(projectUsers.entries()).map(([userId, userData]) => {
          const user = workLogs?.find(log => log.user_id === userId);
          const efficiency = userData.tasks.size > 0 
            ? (userData.completedTasks / userData.tasks.size) * 100 
            : 0;
          
          return {
            userId,
            userName: user?.users?.name || 'Unknown User',
            hours: Math.round(userData.hours * 100) / 100,
            tasks: userData.tasks.size,
            completedTasks: userData.completedTasks,
            efficiency: Math.round(efficiency * 100) / 100,
          };
        }).sort((a, b) => b.hours - a.hours);

        // Get task breakdown
        projectData.taskBreakdown = Array.from(taskMap.entries())
          .filter(([taskId, taskData]) => {
            const task = allTasks?.find(t => t.id === taskId);
            return task?.project_id === project.id;
          })
          .map(([taskId, taskData]) => {
            const task = allTasks?.find(t => t.id === taskId);
            const efficiency = taskData.estimatedHours > 0 
              ? (taskData.hours / taskData.estimatedHours) * 100 
              : 0;
            
            return {
              taskId,
              taskName: task?.name || 'Unknown Task',
              status: taskData.status,
              assignedUser: taskData.assignedUser,
              estimatedHours: taskData.estimatedHours,
              actualHours: Math.round(taskData.hours * 100) / 100,
              efficiency: Math.round(efficiency * 100) / 100,
            };
          })
          .sort((a, b) => b.actualHours - a.actualHours);
      });

      // Convert to array and sort
      const projectsArray = Array.from(projectMap.values()).sort((a, b) => {
        switch (sortBy) {
          case 'hours':
            return b.totalHours - a.totalHours;
          case 'efficiency':
            return b.efficiency - a.efficiency;
          case 'completion':
            return (b.completedTasks / b.taskCount) - (a.completedTasks / a.taskCount);
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return b.totalHours - a.totalHours;
        }
      });

      setProjects(projectsArray);

    } catch (error) {
      console.error('Error fetching project analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAnalytics();
  }, [timeRange, sortBy]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency <= 80) return 'text-green-600';
    if (efficiency <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'to do':
        return 'bg-gray-100 text-gray-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredProjects = selectedProject === 'all' 
    ? projects 
    : projects.filter(p => p.id === selectedProject);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">By Hours</SelectItem>
              <SelectItem value="efficiency">By Efficiency</SelectItem>
              <SelectItem value="completion">By Completion</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(filteredProjects.reduce((sum, p) => sum + p.totalHours, 0) * 100) / 100}
            </div>
            <p className="text-xs text-muted-foreground">
              Hours logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredProjects.length > 0 
                ? Math.round(filteredProjects.reduce((sum, p) => sum + p.efficiency, 0) / filteredProjects.length * 100) / 100
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Actual vs estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredProjects.length > 0 
                ? Math.round(filteredProjects.reduce((sum, p) => sum + (p.completedTasks / p.taskCount), 0) / filteredProjects.length * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Analytics</CardTitle>
          <CardDescription>
            Detailed breakdown of project time allocation and efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">{project.type}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="font-medium">{Math.round(project.totalHours * 100) / 100}h</div>
                        <div className="text-xs text-muted-foreground">
                          Est: {project.estimatedHours}h
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{project.userCount}</TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="font-medium">{project.completedTasks}/{project.taskCount}</div>
                        <Progress 
                          value={(project.completedTasks / project.taskCount) * 100} 
                          className="w-16 mt-1" 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={getEfficiencyColor(project.efficiency)}>
                        {Math.round(project.efficiency * 100) / 100}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={isOverdue(project.deadline) ? 'text-red-600' : ''}>
                          {formatDate(project.deadline)}
                        </span>
                        {isOverdue(project.deadline) && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No project data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Breakdown for Selected Project */}
      {selectedProject !== 'all' && filteredProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Breakdown - {filteredProjects[0].name}</CardTitle>
            <CardDescription>
              Time allocation and productivity by team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProjects[0].userBreakdown.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects[0].userBreakdown.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell>{user.hours}h</TableCell>
                      <TableCell>{user.tasks}</TableCell>
                      <TableCell>{user.completedTasks}</TableCell>
                      <TableCell>
                        <span className={getEfficiencyColor(user.efficiency)}>
                          {user.efficiency}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No user data available for this project
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
