import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Users, FolderOpen, BarChart3, Plus, ArrowLeft, TrendingUp, Clock, CheckCircle, AlertCircle, Activity, Calendar, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectComments } from '@/components/projects/ProjectComments';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskComments } from '@/components/tasks/TaskComments';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

// Dashboard analytics interface
interface DashboardData {
  totalProjects: number;
  totalUsers: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalHours: number;
  activeUsers: number;
  projectsInProgress: number;
  completionRate: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
  projectStatusBreakdown: {
    open: number;
    inProgress: number;
    completed: number;
    onHold: number;
  };
  taskStatusBreakdown: {
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}
 
const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showComments, setShowComments] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalProjects: 0,
    totalUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    totalHours: 0,
    activeUsers: 0,
    projectsInProgress: 0,
    completionRate: 0,
    recentActivities: [],
    projectStatusBreakdown: {
      open: 0,
      inProgress: 0,
      completed: 0,
      onHold: 0,
    },
    taskStatusBreakdown: {
      todo: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Task management states
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showTaskComments, setShowTaskComments] = useState<any>(null);
  
  // Detail view states
  const [showProjectDetail, setShowProjectDetail] = useState<any>(null);
  const [showTaskDetail, setShowTaskDetail] = useState<any>(null);

  // Real-time data fetching function
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch projects data
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) throw projectsError;

      // Fetch users data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Fetch tasks data
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, projects(name), users(name)');

      if (tasksError) throw tasksError;

      // Fetch work logs for total hours calculation
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select('*')
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (workLogsError) throw workLogsError;

      // Calculate metrics
      const totalProjects = projects?.length || 0;
      const totalUsers = users?.length || 0;
      const totalTasks = tasks?.length || 0;
      
      // Task status breakdown
      const completedTasks = tasks?.filter(task => task.status === 'Completed').length || 0;
      const pendingTasks = tasks?.filter(task => task.status === 'Todo').length || 0;
      const inProgressTasks = tasks?.filter(task => task.status === 'In Progress').length || 0;
      
      // Calculate overdue tasks (tasks with deadline passed and not completed)
      const now = new Date();
      const overdueTasks = tasks?.filter(task => {
        if (task.status === 'Completed') return false;
        // Assuming we'll add deadline field to tasks
        return false; // For now, set to 0 until deadline field is added
      }).length || 0;

      // Project status breakdown
      const projectStatusBreakdown = {
        open: projects?.filter(p => p.status === 'Open').length || 0,
        inProgress: projects?.filter(p => p.status === 'In Progress').length || 0,
        completed: projects?.filter(p => p.status === 'Completed').length || 0,
        onHold: projects?.filter(p => p.status === 'On Hold').length || 0,
      };

      // Task status breakdown
      const taskStatusBreakdown = {
        todo: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
      };

      // Calculate total hours from work logs
      const totalHours = workLogs?.reduce((total, log) => {
        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0) || 0;

      // Calculate active users (users who logged time in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentWorkLogs = workLogs?.filter(log => new Date(log.start_time) >= sevenDaysAgo) || [];
      const activeUsers = new Set(recentWorkLogs.map(log => log.user_id)).size;

      // Calculate completion rate
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Generate recent activities (mock data for now - in real app, you'd have an activities table)
      const recentActivities = [
        {
          id: '1',
          type: 'project_created',
          description: 'New project created',
          timestamp: new Date().toISOString(),
          user: 'Admin'
        },
        // Add more activities based on actual data
      ];

      setDashboardData({
        totalProjects,
        totalUsers,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalHours: Math.round(totalHours * 100) / 100,
        activeUsers,
        projectsInProgress: projectStatusBreakdown.inProgress,
        completionRate: Math.round(completionRate * 100) / 100,
        recentActivities,
        projectStatusBreakdown,
        taskStatusBreakdown,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions for live updates
    const projectsSubscription = supabase
      .channel('projects-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'projects' }, 
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' }, 
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' }, 
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const workLogsSubscription = supabase
      .channel('work-logs-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_logs' }, 
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(projectsSubscription);
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(usersSubscription);
      supabase.removeChannel(workLogsSubscription);
    };
  }, []);

  // Refresh data when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchDashboardData();
    }
  }, [refreshTrigger]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setShowProjectForm(true);
    setShowProjectDetail(null);
  };

  const handleProjectSuccess = () => {
    setShowProjectForm(false);
    setEditingProject(null);
    setShowProjectDetail(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewComments = (project: any) => {
    setShowComments(project);
    setShowProjectDetail(null);
  };

  const handleCommentsClose = () => {
    setShowComments(null);
    setRefreshTrigger(prev => prev + 1);
  };

  // Task management handlers
  const handleViewTasks = (project: any) => {
    setSelectedProject(project);
    setShowProjectForm(false);
    setShowComments(null);
    setShowProjectDetail(null);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setShowTaskForm(false);
    setEditingTask(null);
    setShowTaskComments(null);
    setShowTaskDetail(null);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setShowTaskForm(true);
    setShowTaskDetail(null);
  };

  const handleTaskSuccess = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setShowTaskDetail(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskComments = (task: any) => {
    setShowTaskComments(task);
    setShowTaskDetail(null);
  };

  const handleTaskCommentsClose = () => {
    setShowTaskComments(null);
    setRefreshTrigger(prev => prev + 1);
  };

  // Detail view handlers
  const handleViewProjectDetail = (project: any) => {
    setShowProjectDetail(project);
    setShowProjectForm(false);
    setShowComments(null);
    setSelectedProject(null);
    setShowTaskDetail(null);
  };

  const handleViewTaskDetail = (task: any) => {
    setShowTaskDetail(task);
    setShowTaskForm(false);
    setShowTaskComments(null);
    setEditingTask(null);
  };

  const handleBackFromProjectDetail = () => {
    setShowProjectDetail(null);
  };

  const handleBackFromTaskDetail = () => {
    setShowTaskDetail(null);
  };

  // Show access denied for non-admin users
  if (profile?.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <Button onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name}</p>
          </div>
          <div className="flex gap-3">
            {(activeTab === 'projects' || activeTab === 'dashboard') && (
              <Button onClick={handleCreateProject}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            )}
            {activeTab === 'dashboard' && (
              <Button variant="outline" onClick={() => setRefreshTrigger(prev => prev + 1)}>
                <Activity className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '...' : dashboardData.totalProjects}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.projectsInProgress} in progress
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '...' : dashboardData.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.completedTasks} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '...' : dashboardData.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    of {dashboardData.totalUsers} total users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '...' : dashboardData.totalHours}h</div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress and Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Completion Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Overall Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{dashboardData.completionRate}%</span>
                    </div>
                    <Progress value={dashboardData.completionRate} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      {dashboardData.completedTasks} of {dashboardData.totalTasks} tasks completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Task Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Task Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">To Do</span>
                      <Badge variant="secondary">{dashboardData.taskStatusBreakdown.todo}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">In Progress</span>
                      <Badge variant="default">{dashboardData.taskStatusBreakdown.inProgress}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">{dashboardData.taskStatusBreakdown.completed}</Badge>
                    </div>
                    {dashboardData.taskStatusBreakdown.overdue > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overdue</span>
                        <Badge variant="destructive">{dashboardData.taskStatusBreakdown.overdue}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            {/* Quick Stats Cards */}
            <div className="mb-8">
             <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Project Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.projectStatusBreakdown.open}</div>
                    <div className="text-sm text-muted-foreground">Open</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{dashboardData.projectStatusBreakdown.inProgress}</div>
                    <div className="text-sm text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.projectStatusBreakdown.completed}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{dashboardData.projectStatusBreakdown.onHold}</div>
                    <div className="text-sm text-muted-foreground">On Hold</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Content Management */}
            {selectedProject ? (
              // Task Management View
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={handleBackToProjects}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to Projects
                        </Button>
                        <div>
                          <CardTitle>Project: {selectedProject.name}</CardTitle>
                          <p className="text-muted-foreground">Manage tasks for this project</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {showTaskForm ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TaskForm
                        projectId={selectedProject.id}
                        editTask={editingTask}
                        onSuccess={handleTaskSuccess}
                        onCancel={() => setShowTaskForm(false)}
                      />
                    </CardContent>
                  </Card>
                ) : showTaskDetail ? (
                  // Task Detail View
                  <TaskDetail
                    task={showTaskDetail}
                    onBack={handleBackFromTaskDetail}
                    onEdit={handleEditTask}
                    onViewComments={handleTaskComments}
                  />
                ) : (
                  <TaskList
                    projectId={selectedProject.id}
                    projectName={selectedProject.name}
                    onCreateTask={handleCreateTask}
                    onEditTask={handleEditTask}
                    onTaskComments={handleTaskComments}
                    onViewDetails={handleViewTaskDetail}
                    refreshTrigger={refreshTrigger}
                  />
                )}
              </div>
            ) : showProjectForm ? (
              // Project Form View
              <Card>
                <CardHeader>
                  <CardTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectForm
                    onSuccess={handleProjectSuccess}
                    onCancel={() => setShowProjectForm(false)}
                    editProject={editingProject}
                  />
                </CardContent>
              </Card>
            ) : showProjectDetail ? (
              // Project Detail View
              <ProjectDetail
                project={showProjectDetail}
                onBack={handleBackFromProjectDetail}
                onEdit={handleEditProject}
                onViewComments={handleViewComments}
                onViewTasks={handleViewTasks}
              />
            ) : (
              // Project List View
              <ProjectList
                onEditProject={handleEditProject}
                onViewComments={handleViewComments}
                onViewTasks={handleViewTasks}
                onViewDetails={handleViewProjectDetail}
                refreshTrigger={refreshTrigger}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>
                  Quick overview of system status and recent activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{isLoading ? '...' : dashboardData.totalProjects}</div>
                    <div className="text-sm text-muted-foreground">Active Projects</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{isLoading ? '...' : dashboardData.completedTasks}</div>
                    <div className="text-sm text-muted-foreground">Completed Tasks</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{isLoading ? '...' : dashboardData.activeUsers}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{isLoading ? '...' : dashboardData.totalHours}h</div>
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Tasks Requiring Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Tasks</span>
                      <Badge variant="secondary">{dashboardData.pendingTasks}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">In Progress</span>
                      <Badge variant="default">{dashboardData.taskStatusBreakdown.inProgress}</Badge>
                    </div>
                    {dashboardData.overdueTasks > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overdue Tasks</span>
                        <Badge variant="destructive">{dashboardData.overdueTasks}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Project Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Progress</span>
                        <span>{dashboardData.completionRate}%</span>
                      </div>
                      <Progress value={dashboardData.completionRate} className="w-full" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dashboardData.completedTasks} of {dashboardData.totalTasks} tasks completed
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {showComments && (
          <ProjectComments
            project={showComments}
            onClose={handleCommentsClose}
            onCommentAdded={() => setRefreshTrigger(prev => prev + 1)}
          />
        )}

        {showTaskComments && (
          <TaskComments
            task={showTaskComments}
            onClose={handleTaskCommentsClose}
            onCommentAdded={handleTaskCommentsClose}
          />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;