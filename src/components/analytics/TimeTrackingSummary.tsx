import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar, TrendingUp, TrendingDown, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeTrackingSummaryProps {
  timeRange: string;
}

interface DailyData {
  date: string;
  hours: number;
  users: number;
  projects: number;
}

interface ProjectSummary {
  projectName: string;
  totalHours: number;
  userCount: number;
  taskCount: number;
  completionRate: number;
}

export const TimeTrackingSummary: React.FC<TimeTrackingSummaryProps> = ({ timeRange }) => {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [avgHoursPerDay, setAvgHoursPerDay] = useState(0);
  const [peakDay, setPeakDay] = useState('');
  const { toast } = useToast();

  const fetchTimeTrackingData = async () => {
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

      // Fetch work logs for time range
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users(name),
          projects(name),
          tasks(name, status)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', now.toISOString());

      if (workLogsError) {
        console.error('Error fetching work logs:', workLogsError);
        throw workLogsError;
      }

      // Process daily data
      const dailyMap = new Map<string, { hours: number; users: Set<string>; projects: Set<string> }>();
      
      workLogs?.forEach(log => {
        const date = new Date(log.start_time).toISOString().split('T')[0];
        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { hours: 0, users: new Set(), projects: new Set() });
        }
        
        const dayData = dailyMap.get(date)!;
        dayData.hours += hours;
        if (log.user_id) dayData.users.add(log.user_id);
        if (log.project_id) dayData.projects.add(log.project_id);
      });

      const dailyArray: DailyData[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        hours: Math.round(data.hours * 100) / 100,
        users: data.users.size,
        projects: data.projects.size,
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setDailyData(dailyArray);

      // Calculate summary metrics
      const totalHours = dailyArray.reduce((sum, day) => sum + day.hours, 0);
      const avgHoursPerDay = dailyArray.length > 0 ? totalHours / dailyArray.length : 0;
      const peakDay = dailyArray.reduce((max, day) => day.hours > max.hours ? day : max, dailyArray[0]);

      setTotalHours(Math.round(totalHours * 100) / 100);
      setAvgHoursPerDay(Math.round(avgHoursPerDay * 100) / 100);
      setPeakDay(peakDay?.date || '');

      // Process project summary
      const projectMap = new Map<string, { hours: number; users: Set<string>; tasks: Set<string>; completedTasks: number }>();
      
      workLogs?.forEach(log => {
        if (!log.project_id) return;
        
        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        if (!projectMap.has(log.project_id)) {
          projectMap.set(log.project_id, { hours: 0, users: new Set(), tasks: new Set(), completedTasks: 0 });
        }
        
        const projectData = projectMap.get(log.project_id)!;
        projectData.hours += hours;
        if (log.user_id) projectData.users.add(log.user_id);
        if (log.task_id) projectData.tasks.add(log.task_id);
        if (log.tasks?.status === 'Completed') projectData.completedTasks++;
      });

      const projectSummaryArray: ProjectSummary[] = Array.from(projectMap.entries()).map(([projectId, data]) => {
        const project = workLogs?.find(log => log.project_id === projectId);
        const completionRate = data.tasks.size > 0 ? (data.completedTasks / data.tasks.size) * 100 : 0;
        
        return {
          projectName: project?.projects?.name || 'Unknown Project',
          totalHours: Math.round(data.hours * 100) / 100,
          userCount: data.users.size,
          taskCount: data.tasks.size,
          completionRate: Math.round(completionRate * 100) / 100,
        };
      }).sort((a, b) => b.totalHours - a.totalHours);

      setProjectSummary(projectSummaryArray);

    } catch (error) {
      console.error('Error fetching time tracking data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load time tracking data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeTrackingData();
  }, [timeRange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      default: return 'This Week';
    }
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

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">
              {getTimeRangeLabel()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHoursPerDay}</div>
            <p className="text-xs text-muted-foreground">
              Daily average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {peakDay ? formatDate(peakDay) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Most productive day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectSummary.length}</div>
            <p className="text-xs text-muted-foreground">
              With logged time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Time Breakdown</CardTitle>
          <CardDescription>
            Hours logged per day for {getTimeRangeLabel()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyData.length > 0 ? (
              <div className="space-y-3">
                {dailyData.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium">{formatDate(day.date)}</div>
                      <Badge variant="secondary">{day.users} users</Badge>
                      <Badge variant="outline">{day.projects} projects</Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-bold">{day.hours}h</div>
                        <div className="text-xs text-muted-foreground">
                          {((day.hours / totalHours) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                      <Progress value={(day.hours / Math.max(...dailyData.map(d => d.hours))) * 100} className="w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No time tracking data available for this period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Project Time Summary</CardTitle>
          <CardDescription>
            Time allocation across projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectSummary.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectSummary.map((project, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{project.projectName}</TableCell>
                    <TableCell>{project.totalHours}h</TableCell>
                    <TableCell>{project.userCount}</TableCell>
                    <TableCell>{project.taskCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={project.completionRate} className="w-20" />
                        <span className="text-sm">{project.completionRate}%</span>
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
    </div>
  );
};
