import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar, TrendingUp, Users, Activity, BarChart3, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkPatternAnalyticsProps {
  timeRange: string;
}

interface WorkPatternData {
  hourlyPattern: HourlyPattern[];
  dailyPattern: DailyPattern[];
  weeklyPattern: WeeklyPattern[];
  teamMetrics: TeamMetrics;
  productivityInsights: ProductivityInsight[];
}

interface HourlyPattern {
  hour: number;
  totalHours: number;
  userCount: number;
  avgHoursPerUser: number;
  efficiency: number;
}

interface DailyPattern {
  day: string;
  totalHours: number;
  userCount: number;
  projectCount: number;
  avgHoursPerUser: number;
  productivity: number;
}

interface WeeklyPattern {
  week: string;
  totalHours: number;
  userCount: number;
  avgHoursPerWeek: number;
  trend: 'up' | 'down' | 'stable';
}

interface TeamMetrics {
  totalHours: number;
  avgHoursPerDay: number;
  peakHour: number;
  peakDay: string;
  mostProductiveUser: string;
  mostProductiveProject: string;
  teamEfficiency: number;
  consistency: number;
}

interface ProductivityInsight {
  type: 'peak_hour' | 'peak_day' | 'efficiency' | 'consistency' | 'trend';
  title: string;
  description: string;
  value: string;
  trend: 'positive' | 'negative' | 'neutral';
}

export const WorkPatternAnalytics: React.FC<WorkPatternAnalyticsProps> = ({ timeRange }) => {
  const [workPatternData, setWorkPatternData] = useState<WorkPatternData>({
    hourlyPattern: [],
    dailyPattern: [],
    weeklyPattern: [],
    teamMetrics: {
      totalHours: 0,
      avgHoursPerDay: 0,
      peakHour: 0,
      peakDay: '',
      mostProductiveUser: '',
      mostProductiveProject: '',
      teamEfficiency: 0,
      consistency: 0,
    },
    productivityInsights: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWorkPatternData = async () => {
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
          tasks(name, status, estimate_hours)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', now.toISOString());

      if (workLogsError) {
        console.error('Error fetching work logs:', workLogsError);
        throw workLogsError;
      }

      // Process hourly pattern
      const hourlyMap = new Map<number, { hours: number; users: Set<string>; estimatedHours: number; actualHours: number }>();
      
      // Process daily pattern
      const dailyMap = new Map<string, { hours: number; users: Set<string>; projects: Set<string>; completedTasks: number; totalTasks: number }>();
      
      // Process weekly pattern
      const weeklyMap = new Map<string, { hours: number; users: Set<string> }>();
      
      // User and project productivity tracking
      const userProductivity = new Map<string, { hours: number; completedTasks: number; name: string }>();
      const projectProductivity = new Map<string, { hours: number; completedTasks: number; name: string }>();

      workLogs?.forEach(log => {
        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const date = start.toISOString().split('T')[0];
        const hour = start.getHours();
        const weekStart = new Date(start);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        // Update hourly pattern
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, { hours: 0, users: new Set(), estimatedHours: 0, actualHours: 0 });
        }
        const hourlyData = hourlyMap.get(hour)!;
        hourlyData.hours += hours;
        if (log.user_id) hourlyData.users.add(log.user_id);
        if (log.tasks?.estimate_hours) hourlyData.estimatedHours += log.tasks.estimate_hours;
        hourlyData.actualHours += hours;

        // Update daily pattern
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { hours: 0, users: new Set(), projects: new Set(), completedTasks: 0, totalTasks: 0 });
        }
        const dailyData = dailyMap.get(date)!;
        dailyData.hours += hours;
        if (log.user_id) dailyData.users.add(log.user_id);
        if (log.project_id) dailyData.projects.add(log.project_id);
        if (log.tasks?.status === 'Completed') dailyData.completedTasks++;
        if (log.task_id) dailyData.totalTasks++;

        // Update weekly pattern
        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, { hours: 0, users: new Set() });
        }
        const weeklyData = weeklyMap.get(weekKey)!;
        weeklyData.hours += hours;
        if (log.user_id) weeklyData.users.add(log.user_id);

        // Update user productivity
        if (log.user_id) {
          if (!userProductivity.has(log.user_id)) {
            userProductivity.set(log.user_id, { hours: 0, completedTasks: 0, name: log.users?.name || 'Unknown' });
          }
          const userData = userProductivity.get(log.user_id)!;
          userData.hours += hours;
          if (log.tasks?.status === 'Completed') userData.completedTasks++;
        }

        // Update project productivity
        if (log.project_id) {
          if (!projectProductivity.has(log.project_id)) {
            projectProductivity.set(log.project_id, { hours: 0, completedTasks: 0, name: log.projects?.name || 'Unknown' });
          }
          const projectData = projectProductivity.get(log.project_id)!;
          projectData.hours += hours;
          if (log.tasks?.status === 'Completed') projectData.completedTasks++;
        }
      });

      // Create hourly pattern array
      const hourlyPattern: HourlyPattern[] = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour,
        totalHours: Math.round(data.hours * 100) / 100,
        userCount: data.users.size,
        avgHoursPerUser: data.users.size > 0 ? Math.round((data.hours / data.users.size) * 100) / 100 : 0,
        efficiency: data.estimatedHours > 0 ? Math.round((data.actualHours / data.estimatedHours) * 100 * 100) / 100 : 0,
      })).sort((a, b) => a.hour - b.hour);

      // Create daily pattern array
      const dailyPattern: DailyPattern[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        day: date,
        totalHours: Math.round(data.hours * 100) / 100,
        userCount: data.users.size,
        projectCount: data.projects.size,
        avgHoursPerUser: data.users.size > 0 ? Math.round((data.hours / data.users.size) * 100) / 100 : 0,
        productivity: data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100 * 100) / 100 : 0,
      })).sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

      // Create weekly pattern array
      const weeklyPattern: WeeklyPattern[] = Array.from(weeklyMap.entries()).map(([week, data]) => ({
        week,
        totalHours: Math.round(data.hours * 100) / 100,
        userCount: data.users.size,
        avgHoursPerWeek: Math.round(data.hours * 100) / 100,
        trend: 'stable', // This would need historical data to calculate properly
      })).sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

      // Calculate team metrics
      const totalHours = dailyPattern.reduce((sum, day) => sum + day.totalHours, 0);
      const avgHoursPerDay = dailyPattern.length > 0 ? totalHours / dailyPattern.length : 0;
      
      // Find peak hour
      const peakHour = hourlyPattern.reduce((max, hour) => hour.totalHours > max.totalHours ? hour : max, hourlyPattern[0]);
      
      // Find peak day
      const peakDay = dailyPattern.reduce((max, day) => day.totalHours > max.totalHours ? day : max, dailyPattern[0]);
      
      // Find most productive user
      const mostProductiveUser = Array.from(userProductivity.entries()).reduce((max, [userId, userData]) => 
        userData.hours > max.hours ? userData : max, { hours: 0, completedTasks: 0, name: 'Unknown' }
      );
      
      // Find most productive project
      const mostProductiveProject = Array.from(projectProductivity.entries()).reduce((max, [projectId, projectData]) => 
        projectData.hours > max.hours ? projectData : max, { hours: 0, completedTasks: 0, name: 'Unknown' }
      );

      // Calculate team efficiency (average of all hourly efficiencies)
      const teamEfficiency = hourlyPattern.length > 0 
        ? hourlyPattern.reduce((sum, hour) => sum + hour.efficiency, 0) / hourlyPattern.length 
        : 0;

      // Calculate consistency (standard deviation of daily hours)
      const dailyHours = dailyPattern.map(day => day.totalHours);
      const avgDailyHours = dailyHours.reduce((sum, hours) => sum + hours, 0) / dailyHours.length;
      const variance = dailyHours.reduce((sum, hours) => sum + Math.pow(hours - avgDailyHours, 2), 0) / dailyHours.length;
      const consistency = Math.max(0, 100 - (Math.sqrt(variance) / avgDailyHours) * 100);

      const teamMetrics: TeamMetrics = {
        totalHours: Math.round(totalHours * 100) / 100,
        avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
        peakHour: peakHour?.hour || 0,
        peakDay: peakDay?.day || '',
        mostProductiveUser: mostProductiveUser.name,
        mostProductiveProject: mostProductiveProject.name,
        teamEfficiency: Math.round(teamEfficiency * 100) / 100,
        consistency: Math.round(consistency * 100) / 100,
      };

      // Generate productivity insights
      const productivityInsights: ProductivityInsight[] = [
        {
          type: 'peak_hour',
          title: 'Peak Productivity Hour',
          description: `Team is most productive at ${peakHour?.hour || 0}:00`,
          value: `${peakHour?.totalHours || 0}h logged`,
          trend: 'positive',
        },
        {
          type: 'peak_day',
          title: 'Most Productive Day',
          description: `Team works most on ${formatDate(peakDay?.day || '')}`,
          value: `${peakDay?.totalHours || 0}h logged`,
          trend: 'positive',
        },
        {
          type: 'efficiency',
          title: 'Team Efficiency',
          description: 'Overall team efficiency vs estimates',
          value: `${teamEfficiency}%`,
          trend: teamEfficiency >= 80 ? 'positive' : teamEfficiency >= 60 ? 'neutral' : 'negative',
        },
        {
          type: 'consistency',
          title: 'Work Consistency',
          description: 'How consistent the team is with daily hours',
          value: `${consistency}%`,
          trend: consistency >= 80 ? 'positive' : consistency >= 60 ? 'neutral' : 'negative',
        },
      ];

      setWorkPatternData({
        hourlyPattern,
        dailyPattern,
        weeklyPattern,
        teamMetrics,
        productivityInsights,
      });

    } catch (error) {
      console.error('Error fetching work pattern data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load work pattern data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkPatternData();
  }, [timeRange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHour = (hour: number) => {
    return `${hour}:00`;
  };

  const getTrendColor = (trend: 'positive' | 'negative' | 'neutral') => {
    switch (trend) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getTrendIcon = (trend: 'positive' | 'negative' | 'neutral') => {
    switch (trend) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-600" />;
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
      {/* Team Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workPatternData.teamMetrics.totalHours}</div>
            <p className="text-xs text-muted-foreground">
              {workPatternData.teamMetrics.avgHoursPerDay}/day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHour(workPatternData.teamMetrics.peakHour)}</div>
            <p className="text-xs text-muted-foreground">
              Most productive time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workPatternData.teamMetrics.teamEfficiency}%</div>
            <p className="text-xs text-muted-foreground">
              Actual vs estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workPatternData.teamMetrics.consistency}%</div>
            <p className="text-xs text-muted-foreground">
              Work pattern consistency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Insights</CardTitle>
          <CardDescription>
            Key insights about team work patterns and productivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workPatternData.productivityInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                {getTrendIcon(insight.trend)}
                <div className="flex-1">
                  <h4 className="font-medium">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  <p className={`text-lg font-bold mt-1 ${getTrendColor(insight.trend)}`}>
                    {insight.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hourly Pattern */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Work Pattern</CardTitle>
          <CardDescription>
            Team activity throughout the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workPatternData.hourlyPattern.length > 0 ? (
            <div className="space-y-3">
              {workPatternData.hourlyPattern.map((hour) => (
                <div key={hour.hour} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium w-12">{formatHour(hour.hour)}</div>
                    <Badge variant="secondary">{hour.userCount} users</Badge>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-bold">{hour.totalHours}h</div>
                      <div className="text-xs text-muted-foreground">
                        {hour.avgHoursPerUser}h/user avg
                      </div>
                    </div>
                    <div className="w-32">
                      <Progress 
                        value={(hour.totalHours / Math.max(...workPatternData.hourlyPattern.map(h => h.totalHours))) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hourly data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Pattern */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Work Pattern</CardTitle>
          <CardDescription>
            Team activity by day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workPatternData.dailyPattern.length > 0 ? (
            <div className="space-y-3">
              {workPatternData.dailyPattern.map((day) => (
                <div key={day.day} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium w-24">{formatDate(day.day)}</div>
                    <Badge variant="secondary">{day.userCount} users</Badge>
                    <Badge variant="outline">{day.projectCount} projects</Badge>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-bold">{day.totalHours}h</div>
                      <div className="text-xs text-muted-foreground">
                        {day.productivity}% productivity
                      </div>
                    </div>
                    <div className="w-32">
                      <Progress 
                        value={(day.totalHours / Math.max(...workPatternData.dailyPattern.map(d => d.totalHours))) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No daily data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Most Productive User</CardTitle>
            <CardDescription>
              Team member with highest output
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold">{workPatternData.teamMetrics.mostProductiveUser}</div>
              <p className="text-sm text-muted-foreground">
                Highest hours logged
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Active Project</CardTitle>
            <CardDescription>
              Project with most time allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold">{workPatternData.teamMetrics.mostProductiveProject}</div>
              <p className="text-sm text-muted-foreground">
                Highest hours logged
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
