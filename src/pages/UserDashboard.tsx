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
  FolderOpen,
  Edit
} from 'lucide-react';
import { ManualWorkLogForm } from '@/components/time-tracking/ManualWorkLogForm';
import { WorkLogEditDialog } from '@/components/time-tracking/WorkLogEditDialog';
import { WorkLogTable } from '@/components/time-tracking/WorkLogTable';
import { UserTaskList } from '@/components/tasks/UserTaskList';
import { UserProjectList } from '@/components/projects/UserProjectList';
import { DateFilter, DateFilterValue } from '@/components/ui/date-filter';
import { WorkLogCalendar } from '@/components/analytics/WorkLogCalendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeEntry {
  id: string;
  hours: string;
  note: string | null;
  created_at: string;
  projects: { name: string; type: string };
  tasks: { name: string; status: string; type: string } | null;
}

interface ProductivityStats {
  totalTasks: number;
  completedTasks: number;
  hoursToday: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
  averageDailyHours: number;
  efficiency: number;
  billableHours: number;
  nonBillableHours: number;
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
  const [editingWorkLog, setEditingWorkLog] = useState<TimeEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  // Initialize date filter with proper Indian timezone handling
  const getIndianDate = () => {
    const now = new Date();
    // Convert to Indian timezone (UTC+5:30)
    const indianTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    return indianTime;
  };

  const initializeDateFilter = () => {
    const indianNow = getIndianDate();
    const startDate = new Date(indianNow);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(indianNow);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      type: 'today' as const,
      startDate,
      endDate
    };
  };

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initializeDateFilter());
  const [stats, setStats] = useState<ProductivityStats>({
    totalTasks: 0,
    completedTasks: 0,
    hoursToday: 0,
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    averageDailyHours: 0,
    efficiency: 0,
    billableHours: 0,
    nonBillableHours: 0,
    projectProgress: [],
    recentActivity: [],
    weeklyTrend: []
  });
  const { toast } = useToast();

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Use the date filter to determine the date range
      const startDate = dateFilter.startDate;
      const endDate = dateFilter.endDate;
      
      console.log('Fetching data for date range:', {
        type: dateFilter.type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        indianTime: new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"})
      });

      // Fetch all time entries for comprehensive analysis
      const { data: allTimeEntries, error: timeError } = await supabase
        .from('work_logs')
        .select(`
          id,
          hours,
          note,
          created_at,
          projects(name, type),
          tasks(name, status, type)
        `)
        .eq('user_id', profile?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (timeError) throw timeError;

      // Fetch user's tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, project_id, projects(name)')
        .eq('assigned_user_id', profile?.id);

      if (tasksError) throw tasksError;

      // Calculate time metrics - since data is already filtered by date range
      const calculateHours = (entries: any[]) => {
        return entries.reduce((total, entry) => {
          if (!entry.hours) return total;
          // Parse hours from HH:MM format
          const [hoursStr, minutesStr] = entry.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          return total + hours;
        }, 0);
      };

      const calculateBillableHours = (entries: any[]) => {
        return entries.reduce((total, entry) => {
          if (!entry.hours) return total;
          // Check task type first, then fallback to project type
          const taskType = entry.tasks?.type?.toLowerCase();
          const projectType = entry.projects?.type?.toLowerCase();
          const isBillable = taskType === 'billable' || (taskType !== 'non-billable' && projectType === 'billable');
          
          if (!isBillable) return total;
          // Parse hours from HH:MM format
          const [hoursStr, minutesStr] = entry.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          return total + hours;
        }, 0);
      };

      const calculateNonBillableHours = (entries: any[]) => {
        return entries.reduce((total, entry) => {
          if (!entry.hours) return total;
          // Check task type first, then fallback to project type
          const taskType = entry.tasks?.type?.toLowerCase();
          const projectType = entry.projects?.type?.toLowerCase();
          const isBillable = taskType === 'billable' || (taskType !== 'non-billable' && projectType === 'billable');
          
          if (isBillable) return total;
          // Parse hours from HH:MM format
          const [hoursStr, minutesStr] = entry.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          return total + hours;
        }, 0);
      };

      const totalHours = calculateHours(allTimeEntries || []);
      const billableHours = calculateBillableHours(allTimeEntries || []);
      const nonBillableHours = calculateNonBillableHours(allTimeEntries || []);

      // Calculate weekly trend - for the selected date range
      const weeklyTrend = [];
      const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const maxDays = Math.min(daysInRange, 7); // Show max 7 days
      
      for (let i = 0; i < maxDays; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
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

      // Calculate average daily hours for the selected period
      const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const averageDailyHours = Math.round((totalHours / daysInPeriod) * 100) / 100;

      setStats({
        totalTasks,
        completedTasks,
        hoursToday: Math.round(totalHours * 100) / 100,
        hoursThisWeek: Math.round(totalHours * 100) / 100,
        hoursThisMonth: Math.round(totalHours * 100) / 100,
        averageDailyHours,
        efficiency,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
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
  }, [profile?.id, dateFilter]);

  // Ensure date filter is properly initialized on mount
  useEffect(() => {
    const currentFilter = initializeDateFilter();
    setDateFilter(currentFilter);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleWorkLogAdded = () => {
    // Refresh the dashboard data when a work log is added
    fetchUserData();
  };

  const handleEditWorkLog = (workLog: TimeEntry) => {
    setEditingWorkLog(workLog);
    setShowEditDialog(true);
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setEditingWorkLog(null);
  };

  const handleWorkLogUpdated = () => {
    // Refresh the dashboard data when a work log is updated
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
      {/* Header Section - Matching Wireframe */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Hello {profile?.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <DateFilter
                value={dateFilter}
                onChange={setDateFilter}
                onRefresh={fetchUserData}
              />
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
                Sign out
              </Button>
            </div>
          </div>
          
          {/* Summary Metrics Row */}
          <div className="grid grid-cols-3 gap-6">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.floor(stats.hoursToday)}:{String(Math.round((stats.hoursToday % 1) * 60)).padStart(2, '0')}
                </div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="text-green-600">
                    Billable: {Math.floor(stats.billableHours)}:{String(Math.round((stats.billableHours % 1) * 60)).padStart(2, '0')}
                  </span>
                  <span className="text-red-600">
                    Non Billable: {Math.floor(stats.nonBillableHours)}:{String(Math.round((stats.nonBillableHours % 1) * 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.completedTasks}/{stats.totalTasks}
                </div>
                <div className="text-sm text-muted-foreground">Task Completed</div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.projectProgress.length}
                </div>
                <div className="text-sm text-muted-foreground">Project contributed</div>
              </div>
            </Card>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Main Dashboard Tabs - Matching Wireframe */}
        <Tabs defaultValue="worklog" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="worklog">Work Log</TabsTrigger>
            <TabsTrigger value="tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* Work Log Tab - Matching Wireframe */}
          <TabsContent value="worklog" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Panel: Work Log Form - 2/5 width */}
              <div className="lg:col-span-2">
                <ManualWorkLogForm onSuccess={handleWorkLogAdded} />
              </div>

              {/* Right Panel: Recent Work Log Table - 3/5 width */}
              <div className="lg:col-span-3">
                <WorkLogTable
                  onEdit={handleEditWorkLog}
                  onDelete={() => fetchUserData()}
                  onView={(workLog) => {
                    // Handle view action if needed
                    console.log('View work log:', workLog);
                  }}
                />
              </div>
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
            <WorkLogCalendar />
          </TabsContent>
        </Tabs>
      </main>

      {/* Work Log Edit Dialog */}
      <WorkLogEditDialog
        workLog={editingWorkLog}
        isOpen={showEditDialog}
        onClose={handleEditDialogClose}
        onSuccess={handleWorkLogUpdated}
      />
    </div>
  );
};

export default UserDashboard;