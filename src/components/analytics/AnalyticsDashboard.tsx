import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectTimeAnalytics } from './ProjectTimeAnalytics';
import { UserTimeAnalytics } from './UserTimeAnalytics';
import { WorkPatternAnalytics } from './WorkPatternAnalytics';
import { TimeTrackingSummary } from './TimeTrackingSummary';

interface AnalyticsData {
  totalProjects: number;
  totalUsers: number;
  totalHours: number;
  averageHoursPerUser: number;
  completionRate: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalProjects: 0,
    totalUsers: 0,
    totalHours: 0,
    averageHoursPerUser: 0,
    completionRate: 0,
  });
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalyticsData = async () => {
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

      // Fetch total projects
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Fetch total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch work logs for time range
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users(name),
          projects(name),
          tasks(name)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', now.toISOString());

      if (workLogsError) {
        console.error('Error fetching work logs:', workLogsError);
        throw workLogsError;
      }

      // Calculate total hours
      const totalHours = workLogs?.reduce((total, log) => {
        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0) || 0;

      // Calculate average hours per user
      const uniqueUsers = new Set(workLogs?.map(log => log.user_id).filter(Boolean));
      const averageHoursPerUser = uniqueUsers.size > 0 ? totalHours / uniqueUsers.size : 0;

      // Fetch completion rate (tasks completed vs total tasks)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      const completedTasks = tasks?.filter(task => task.status === 'Completed').length || 0;
      const totalTasks = tasks?.length || 0;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      setAnalyticsData({
        totalProjects: projectsCount || 0,
        totalUsers: usersCount || 0,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHoursPerUser: Math.round(averageHoursPerUser * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Track project progress, team productivity, and time allocation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalHours}</div>
            <p className="text-xs text-muted-foreground">
              Hours logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageHoursPerUser}</div>
            <p className="text-xs text-muted-foreground">
              Per user average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Task completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="projects">Project Analytics</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="patterns">Work Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <TimeTrackingSummary timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <ProjectTimeAnalytics timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserTimeAnalytics timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <WorkPatternAnalytics timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
