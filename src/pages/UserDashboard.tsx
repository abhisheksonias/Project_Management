import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogOut, 
  CheckSquare, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Target,
  BarChart3,
  Activity,
  Zap,
  Award,
  Users,
  FolderOpen
} from 'lucide-react';
import { ManualWorkLogForm } from '@/components/time-tracking/ManualWorkLogForm';
import { UserTaskList } from '@/components/tasks/UserTaskList';
import { UserProjectList } from '@/components/projects/UserProjectList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeEntry {
  id: string;
  hours: string;
  note: string | null;
  created_at: string;
  projects: { name: string; type: string };
  tasks: { name: string; status: string } | null;
}

interface ProductivityStats {
  totalTasks: number;
  completedTasks: number;
  hoursToday: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
  averageDailyHours: number;
  efficiency: number;
  projectProgress: Array<{
    projectName: string;
    totalHours: number;
    taskCount: number;
    completedTasks: number;
    progress: number;
  }>;
  recentActivity: TimeEntry[];
  weeklyTrend: Array<{
    day: string;
    hours: number;
  }>;
}

const UserDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProductivityStats>({
    totalTasks: 0,
    completedTasks: 0,
    hoursToday: 0,
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    averageDailyHours: 0,
    efficiency: 0,
    projectProgress: [],
    recentActivity: [],
    weeklyTrend: []
  });
  const { toast } = useToast();

  const fetchUserData = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch all time entries for comprehensive analysis
      const { data: allTimeEntries, error: timeError } = await supabase
        .from('work_logs')
        .select(`
          id,
          hours,
          note,
          created_at,
          projects(name, type),
          tasks(name, status)
        `)
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (timeError) throw timeError;

      // Fetch user's tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, project_id, projects(name)')
        .eq('assigned_user_id', profile?.id);

      if (tasksError) throw tasksError;

      // Calculate time metrics
      const calculateHours = (entries: any[], startDate: Date) => {
        return entries
          .filter(entry => new Date(entry.created_at) >= startDate)
          .reduce((total, entry) => {
            if (!entry.hours) return total;
            // Parse hours from HH:MM format
            const [hoursStr, minutesStr] = entry.hours.split(':');
            const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
            return total + hours;
          }, 0);
      };

      const hoursToday = calculateHours(allTimeEntries || [], todayStart);
      const hoursThisWeek = calculateHours(allTimeEntries || [], weekStart);
      const hoursThisMonth = calculateHours(allTimeEntries || [], monthStart);

      // Calculate weekly trend
      const weeklyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayHours = (allTimeEntries || [])
          .filter(entry => {
            const entryDate = new Date(entry.created_at);
            return entryDate >= dayStart && entryDate <= dayEnd;
          })
          .reduce((total, entry) => {
            if (!entry.hours) return total;
            // Parse hours from HH:MM format
            const [hoursStr, minutesStr] = entry.hours.split(':');
            const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
            return total + hours;
          }, 0);

        weeklyTrend.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          hours: Math.round(dayHours * 100) / 100
        });
      }

      // Calculate project progress
      const projectMap = new Map();
      (allTimeEntries || []).forEach(entry => {
        const projectName = entry.projects?.name || 'Unknown Project';
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, {
            projectName,
            totalHours: 0,
            taskCount: 0,
            completedTasks: 0
          });
        }
        
        if (!entry.hours) return;
        // Parse hours from HH:MM format
        const [hoursStr, minutesStr] = entry.hours.split(':');
        const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
        projectMap.get(projectName).totalHours += hours;
      });

      // Add task counts to projects
      (tasks || []).forEach(task => {
        const projectName = task.projects?.name || 'Unknown Project';
        if (projectMap.has(projectName)) {
          projectMap.get(projectName).taskCount += 1;
          if (task.status.toLowerCase() === 'completed') {
            projectMap.get(projectName).completedTasks += 1;
          }
        }
      });

      const projectProgress = Array.from(projectMap.values()).map(project => ({
        ...project,
        totalHours: Math.round(project.totalHours * 100) / 100,
        progress: project.taskCount > 0 ? Math.round((project.completedTasks / project.taskCount) * 100) : 0
      }));

      // Calculate efficiency (completed tasks / total tasks)
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(task => task.status.toLowerCase() === 'completed').length || 0;
      const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate average daily hours (last 30 days)
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const recentHours = calculateHours(allTimeEntries || [], thirtyDaysAgo);
      const averageDailyHours = Math.round((recentHours / 30) * 100) / 100;

      setStats({
        totalTasks,
        completedTasks,
        hoursToday: Math.round(hoursToday * 100) / 100,
        hoursThisWeek: Math.round(hoursThisWeek * 100) / 100,
        hoursThisMonth: Math.round(hoursThisMonth * 100) / 100,
        averageDailyHours,
        efficiency,
        projectProgress: projectProgress.sort((a, b) => b.totalHours - a.totalHours),
        recentActivity: (allTimeEntries || []).slice(0, 5),
        weeklyTrend
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchUserData();
    }
  }, [profile?.id]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleWorkLogAdded = () => {
    // Refresh the dashboard data when a work log is added
    fetchUserData();
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold">Productivity Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {profile?.name}</p>
            </div>
            {profile?.specialization && (
              <Badge variant="outline" className="text-xs">
                {profile.specialization}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content - Compact Layout */}
      <main className="container mx-auto px-4 py-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-lg font-bold">{stats.hoursToday}h</div>
                <div className="text-xs text-muted-foreground">Today</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-lg font-bold">{stats.hoursThisWeek}h</div>
                <div className="text-xs text-muted-foreground">This Week</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-lg font-bold">{stats.hoursThisMonth}h</div>
                <div className="text-xs text-muted-foreground">This Month</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-lg font-bold">{stats.efficiency}%</div>
                <div className="text-xs text-muted-foreground">Efficiency</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="text-lg font-bold">{stats.completedTasks}/{stats.totalTasks}</div>
                <div className="text-xs text-muted-foreground">Tasks Done</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-lg font-bold">{stats.averageDailyHours}h</div>
                <div className="text-xs text-muted-foreground">Daily Avg</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="tracking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tracking">Time Tracking</TabsTrigger>
            <TabsTrigger value="tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* Time Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Time Tracking</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Manual Entry
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ManualWorkLogForm onSuccess={handleWorkLogAdded} />

              {/* Quick Stats for Time Tracking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Productivity Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Today's Goal</div>
                      <div className="text-xs text-muted-foreground">Target: 8 hours</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{stats.hoursToday}h</div>
                      <Progress value={(stats.hoursToday / 8) * 100} className="w-16 h-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Weekly Progress</div>
                      <div className="text-xs text-muted-foreground">Target: 40 hours</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{stats.hoursThisWeek}h</div>
                      <Progress value={(stats.hoursThisWeek / 40) * 100} className="w-16 h-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Task Efficiency</div>
                      <div className="text-xs text-muted-foreground">Completion rate</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">{stats.efficiency}%</div>
                      <Progress value={stats.efficiency} className="w-16 h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <UserTaskList />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            {/* Project List */}
            <UserProjectList />
            
            {/* Project Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Project Analysis
                </CardTitle>
                <CardDescription>Time spent and progress across all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.projectProgress.map((project, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{project.projectName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.completedTasks} of {project.taskCount} tasks completed
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{project.totalHours}h</div>
                          <Badge variant={project.progress >= 80 ? "default" : project.progress >= 50 ? "secondary" : "outline"}>
                            {project.progress}% Complete
                          </Badge>
                        </div>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Activity Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Weekly Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.weeklyTrend.map((day, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium w-12">{day.day}</span>
                        <div className="flex-1 mx-3">
                          <Progress 
                            value={Math.min((day.hours / 8) * 100, 100)} 
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {day.hours}h
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Project Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Project Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.projectProgress.slice(0, 5).map((project, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{project.projectName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {project.completedTasks}/{project.taskCount}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {project.totalHours}h
                            </Badge>
                          </div>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : stats.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentActivity.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{entry.projects.name}</div>
                          {entry.tasks && (
                            <div className="text-xs text-muted-foreground">{entry.tasks.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(entry.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{formatDuration(entry.hours)}</div>
                          <Badge variant="secondary" className="text-xs">
                            {entry.tasks ? 'Task' : 'Project'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recent activity.</p>
                    <p className="text-sm mt-2">Start tracking your work time to see activity here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UserDashboard;