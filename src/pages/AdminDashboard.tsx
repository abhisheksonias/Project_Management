import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Users, FolderOpen, BarChart3, Plus, ArrowLeft, TrendingUp, Clock, CheckCircle, AlertCircle, Calendar, Target, FileText, RefreshCw, DollarSign, ChevronUp } from 'lucide-react';
import { UnifiedFilter } from '@/components/ui/unified-filter';
import { useFilter } from '@/contexts/FilterContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectComments } from '@/components/projects/ProjectComments';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { TaskList } from '@/components/tasks/TaskList';
import { CompactTaskList } from '@/components/tasks/CompactTaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskComments } from '@/components/tasks/TaskComments';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { EnhancedAnalyticsDashboard } from '@/components/analytics/EnhancedAnalyticsDashboard';
import { EnhancedWorkLogManager } from '@/components/admin/EnhancedWorkLogManager';

// Dashboard analytics interface
interface DashboardData {
  totalProjects: number;
  totalUsers: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
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
    clientApproval: number;
  };
  taskStatusBreakdown: {
    todo: number;
    inProgress: number;
    completed: number;
    blocked: number;
    review: number;
    overdue: number;
  };
}
 
const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const { filterValue, getDateRange } = useFilter();
  const [activeTab, setActiveTab] = useState('projects');
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
    billableHours: 0,
    nonBillableHours: 0,
    activeUsers: 0,
    projectsInProgress: 0,
    completionRate: 0,
    recentActivities: [],
    projectStatusBreakdown: {
      open: 0,
      inProgress: 0,
      completed: 0,
      onHold: 0,
      clientApproval: 0,
    },
    taskStatusBreakdown: {
      todo: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      review: 0,
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

      // Fetch work logs for total hours calculation based on filter
      const dateRange = getDateRange();
      let workLogsQuery = supabase
        .from('work_logs')
        .select(`
          *,
          tasks(type)
        `);

      // Apply date filtering if date range is available
      if (dateRange) {
        workLogsQuery = workLogsQuery
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString());
      }

      const { data: workLogs, error: workLogsError } = await workLogsQuery;

      if (workLogsError) throw workLogsError;

      // Calculate metrics
      const totalProjects = projects?.length || 0;
      const totalUsers = users?.length || 0;
      const totalTasks = tasks?.length || 0;
      
      // Task status breakdown
      const completedTasks = tasks?.filter(task => task.status === 'Completed').length || 0;
      const pendingTasks = tasks?.filter(task => task.status === 'To Do').length || 0;
      const inProgressTasks = tasks?.filter(task => task.status === 'In Progress').length || 0;
      const blockedTasks = tasks?.filter(task => task.status === 'Blocked').length || 0;
      const reviewTasks = tasks?.filter(task => task.status === 'Review').length || 0;
      
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
        clientApproval: projects?.filter(p => p.status === 'Client Approval').length || 0,
      };

      // Task status breakdown
      const taskStatusBreakdown = {
        todo: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        blocked: blockedTasks,
        review: reviewTasks,
        overdue: overdueTasks,
      };

      // Calculate total hours, billable hours, and non-billable hours from work logs
      let totalHours = 0;
      let billableHours = 0;
      let nonBillableHours = 0;
      
      workLogs?.forEach(log => {
        // Skip if hours is null or undefined
        if (!log.hours) return;
        
        // Parse hours from HH:MM format
        const [hoursStr, minutesStr] = log.hours.split(':');
        const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
        
        totalHours += hours;
        
        // Check if task is billable or non-billable
        const taskType = log.tasks?.type;
        if (taskType === 'billable') {
          billableHours += hours;
        } else if (taskType === 'non-billable') {
          nonBillableHours += hours;
        }
      });

      // Calculate active users (users who have logged time)
      const activeUsers = new Set(workLogs?.map(log => log.user_id)).size;

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
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
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

  // Refresh data when filter changes
  useEffect(() => {
    fetchDashboardData();
  }, [filterValue]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
    setActiveTab('projects'); // Switch to projects tab to show the form
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
      {/* Header - Matching Wireframe */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">{profile?.name} Time to cook Business ^_^</h1>
            </div>
            <div className="flex items-center gap-4">
              <UnifiedFilter
                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              />
              
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Summary Metrics Row - Matching Wireframe */}
          <div className="grid grid-cols-3 gap-6">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.floor(dashboardData.totalHours)}:{String(Math.round((dashboardData.totalHours % 1) * 60)).padStart(2, '0')}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Hours ({filterValue.type === 'today' ? 'Today' : 
                               filterValue.type === 'week' ? 'This Week' : 
                               filterValue.type === 'month' ? 'This Month' : 
                               filterValue.type === 'quarter' ? 'This Quarter' : 
                               filterValue.type === 'year' ? 'This Year' : 
                               'Custom Range'})
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="text-green-600 font-bold">
                    Billable: {Math.floor(dashboardData.billableHours)}:{String(Math.round((dashboardData.billableHours % 1) * 60)).padStart(2, '0')}
                  </span>
                  <span className="text-red-600 font-bold">
                    Non Billable: {Math.floor(dashboardData.nonBillableHours)}:{String(Math.round((dashboardData.nonBillableHours % 1) * 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </Card>
            
            <Card className="p-2">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  Projects
                </div>
                <div className="text-xl font-bold text-muted-foreground">
                  {dashboardData.projectsInProgress}/{dashboardData.totalProjects}
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-2 text-xs">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Open: {dashboardData.projectStatusBreakdown.open}</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">IP: {dashboardData.projectStatusBreakdown.inProgress}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Comp: {dashboardData.projectStatusBreakdown.completed}</span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">On Hold: {dashboardData.projectStatusBreakdown.onHold}</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">CA: {dashboardData.projectStatusBreakdown.clientApproval}</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-2">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  Tasks
                </div>
                <div className="text-xl font-bold text-muted-foreground">
                  {dashboardData.completedTasks}/{dashboardData.totalTasks}
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-2 text-xs">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">To Do: {dashboardData.taskStatusBreakdown.todo}</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">In pro.: {dashboardData.taskStatusBreakdown.inProgress}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Comp. : {dashboardData.taskStatusBreakdown.completed}</span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Block : {dashboardData.taskStatusBreakdown.blocked}</span>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Review: {dashboardData.taskStatusBreakdown.review}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="projects">Project</TabsTrigger>
            <TabsTrigger value="tasks">Task</TabsTrigger>
            <TabsTrigger value="worklogs">Work Log</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>


          <TabsContent value="projects" className="space-y-6">
            {/* Project Management Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">Project Management</h2>
                <p className="text-muted-foreground">Manage and track all projects</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateProject}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
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

          <TabsContent value="tasks" className="space-y-6">
            

            {/* Task Management Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">Task Management</h2>
                {/* <p className="text-muted-foreground">Manage and track all tasks across projects</p> */}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                {/* <Button 
                  onClick={() => {
                    setEditingTask(null);
                    setShowTaskForm(true);
                  }} 
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button> */}
              </div>
            </div>
            
            {showTaskForm ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</CardTitle>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowTaskForm(false);
                        setEditingTask(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <TaskForm
                    onSuccess={handleTaskSuccess}
                    onCancel={() => {
                      setShowTaskForm(false);
                      setEditingTask(null);
                    }}
                    editTask={editingTask}
                  />
                </CardContent>
              </Card>
            ) : showTaskDetail ? (
              <TaskDetail
                task={showTaskDetail}
                onBack={handleBackFromTaskDetail}
                onEdit={handleEditTask}
                onViewComments={handleTaskComments}
              />
            ) : (
              <CompactTaskList
                projectId={null} // Show all tasks
                projectName="All Tasks"
                onCreateTask={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}
                onEditTask={handleEditTask}
                onTaskComments={handleTaskComments}
                onViewDetails={handleViewTaskDetail}
                refreshTrigger={refreshTrigger}
              />
            )}
          </TabsContent>

          <TabsContent value="worklogs" className="space-y-6">
            <EnhancedWorkLogManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <EnhancedAnalyticsDashboard />
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