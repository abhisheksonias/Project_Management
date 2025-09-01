import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Users, TrendingUp, Calendar, Target, Star, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserTimeAnalyticsProps {
  timeRange: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  specialization: string | null;
  totalHours: number;
  avgHoursPerDay: number;
  projectCount: number;
  taskCount: number;
  completedTasks: number;
  efficiency: number;
  productivity: number;
  workPattern: WorkPattern;
  projectBreakdown: ProjectBreakdown[];
  dailyBreakdown: DailyBreakdown[];
}

interface WorkPattern {
  peakDay: string;
  peakHour: number;
  avgSessionLength: number;
  totalSessions: number;
  consistency: number;
}

interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  hours: number;
  tasks: number;
  completedTasks: number;
  efficiency: number;
}

interface DailyBreakdown {
  date: string;
  hours: number;
  projects: number;
  tasks: number;
}

export const UserTimeAnalytics: React.FC<UserTimeAnalyticsProps> = ({ timeRange }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('hours');
  const { toast } = useToast();

  const fetchUserAnalytics = async () => {
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

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Fetch work logs for time range
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          users(name, email, role, specialization),
          projects(name),
          tasks(name, status, estimate_hours)
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

      // Process user data
      const userMap = new Map<string, UserData>();
      
      // Initialize all users
      usersData?.forEach(user => {
        userMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'User',
          specialization: user.specialization,
          totalHours: 0,
          avgHoursPerDay: 0,
          projectCount: 0,
          taskCount: 0,
          completedTasks: 0,
          efficiency: 0,
          productivity: 0,
          workPattern: {
            peakDay: '',
            peakHour: 0,
            avgSessionLength: 0,
            totalSessions: 0,
            consistency: 0,
          },
          projectBreakdown: [],
          dailyBreakdown: [],
        });
      });

      // Process work logs by user
      const userWorkLogs = new Map<string, any[]>();
      const userDailyMap = new Map<string, Map<string, { hours: number; projects: Set<string>; tasks: Set<string> }>>();
      const userProjectMap = new Map<string, Map<string, { hours: number; tasks: Set<string>; completedTasks: number; estimatedHours: number }>>();
      const userHourlyMap = new Map<string, Map<number, number>>();

      workLogs?.forEach(log => {
        if (!log.user_id) return;

        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const date = start.toISOString().split('T')[0];
        const hour = start.getHours();

        // Collect user work logs
        if (!userWorkLogs.has(log.user_id)) {
          userWorkLogs.set(log.user_id, []);
        }
        userWorkLogs.get(log.user_id)!.push(log);

        // Update user total hours
        const user = userMap.get(log.user_id);
        if (user) {
          user.totalHours += hours;
        }

        // Update daily breakdown
        if (!userDailyMap.has(log.user_id)) {
          userDailyMap.set(log.user_id, new Map());
        }
        const userDaily = userDailyMap.get(log.user_id)!;
        
        if (!userDaily.has(date)) {
          userDaily.set(date, { hours: 0, projects: new Set(), tasks: new Set() });
        }
        const dayData = userDaily.get(date)!;
        dayData.hours += hours;
        if (log.project_id) dayData.projects.add(log.project_id);
        if (log.task_id) dayData.tasks.add(log.task_id);

        // Update project breakdown
        if (log.project_id) {
          if (!userProjectMap.has(log.user_id)) {
            userProjectMap.set(log.user_id, new Map());
          }
          const userProjects = userProjectMap.get(log.user_id)!;
          
          if (!userProjects.has(log.project_id)) {
            userProjects.set(log.project_id, { hours: 0, tasks: new Set(), completedTasks: 0, estimatedHours: 0 });
          }
          const projectData = userProjects.get(log.project_id)!;
          projectData.hours += hours;
          if (log.task_id) projectData.tasks.add(log.task_id);
          if (log.tasks?.status === 'Completed') projectData.completedTasks++;
          if (log.tasks?.estimate_hours) projectData.estimatedHours += log.tasks.estimate_hours;
        }

        // Update hourly pattern
        if (!userHourlyMap.has(log.user_id)) {
          userHourlyMap.set(log.user_id, new Map());
        }
        const userHourly = userHourlyMap.get(log.user_id)!;
        userHourly.set(hour, (userHourly.get(hour) || 0) + hours);
      });

      // Calculate user metrics
      usersData?.forEach(user => {
        const userData = userMap.get(user.id)!;
        const userLogs = userWorkLogs.get(user.id) || [];
        const userDaily = userDailyMap.get(user.id) || new Map();
        const userProjects = userProjectMap.get(user.id) || new Map();
        const userHourly = userHourlyMap.get(user.id) || new Map();

        // Calculate average hours per day
        const totalDays = userDaily.size;
        userData.avgHoursPerDay = totalDays > 0 ? userData.totalHours / totalDays : 0;

        // Calculate project count
        userData.projectCount = userProjects.size;

        // Calculate task metrics
        const userTasks = allTasks?.filter(task => 
          userLogs.some(log => log.task_id === task.id)
        ) || [];
        userData.taskCount = userTasks.length;
        userData.completedTasks = userTasks.filter(task => task.status === 'Completed').length;

        // Calculate efficiency (actual vs estimated hours)
        const totalEstimatedHours = userTasks.reduce((sum, task) => sum + (task.estimate_hours || 0), 0);
        userData.efficiency = totalEstimatedHours > 0 ? (userData.totalHours / totalEstimatedHours) * 100 : 0;

        // Calculate productivity (completed tasks per hour)
        userData.productivity = userData.totalHours > 0 ? userData.completedTasks / userData.totalHours : 0;

        // Calculate work pattern
        const sessions = userLogs.length;
        const avgSessionLength = sessions > 0 ? userData.totalHours / sessions : 0;
        
        // Find peak day
        let peakDay = '';
        let maxHours = 0;
        userDaily.forEach((dayData, date) => {
          if (dayData.hours > maxHours) {
            maxHours = dayData.hours;
            peakDay = date;
          }
        });

        // Find peak hour
        let peakHour = 0;
        let maxHourlyHours = 0;
        userHourly.forEach((hours, hour) => {
          if (hours > maxHourlyHours) {
            maxHourlyHours = hours;
            peakHour = hour;
          }
        });

        // Calculate consistency (standard deviation of daily hours)
        const dailyHours = Array.from(userDaily.values()).map(day => day.hours);
        const avgDailyHours = dailyHours.reduce((sum, hours) => sum + hours, 0) / dailyHours.length;
        const variance = dailyHours.reduce((sum, hours) => sum + Math.pow(hours - avgDailyHours, 2), 0) / dailyHours.length;
        const consistency = Math.max(0, 100 - (Math.sqrt(variance) / avgDailyHours) * 100);

        userData.workPattern = {
          peakDay,
          peakHour,
          avgSessionLength: Math.round(avgSessionLength * 100) / 100,
          totalSessions: sessions,
          consistency: Math.round(consistency * 100) / 100,
        };

        // Create daily breakdown
        userData.dailyBreakdown = Array.from(userDaily.entries()).map(([date, dayData]) => ({
          date,
          hours: Math.round(dayData.hours * 100) / 100,
          projects: dayData.projects.size,
          tasks: dayData.tasks.size,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Create project breakdown
        userData.projectBreakdown = Array.from(userProjects.entries()).map(([projectId, projectData]) => {
          const project = userLogs.find(log => log.project_id === projectId);
          const efficiency = projectData.estimatedHours > 0 
            ? (projectData.hours / projectData.estimatedHours) * 100 
            : 0;
          
          return {
            projectId,
            projectName: project?.projects?.name || 'Unknown Project',
            hours: Math.round(projectData.hours * 100) / 100,
            tasks: projectData.tasks.size,
            completedTasks: projectData.completedTasks,
            efficiency: Math.round(efficiency * 100) / 100,
          };
        }).sort((a, b) => b.hours - a.hours);
      });

      // Convert to array and sort
      const usersArray = Array.from(userMap.values()).sort((a, b) => {
        switch (sortBy) {
          case 'hours':
            return b.totalHours - a.totalHours;
          case 'efficiency':
            return b.efficiency - a.efficiency;
          case 'productivity':
            return b.productivity - a.productivity;
          case 'consistency':
            return b.workPattern.consistency - a.workPattern.consistency;
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return b.totalHours - a.totalHours;
        }
      });

      setUsers(usersArray);

    } catch (error) {
      console.error('Error fetching user analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAnalytics();
  }, [timeRange, sortBy]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency <= 80) return 'text-green-600';
    if (efficiency <= 120) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 0.5) return 'text-green-600';
    if (productivity >= 0.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConsistencyColor = (consistency: number) => {
    if (consistency >= 80) return 'text-green-600';
    if (consistency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHour = (hour: number) => {
    return `${hour}:00`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

  const filteredUsers = selectedUser === 'all' 
    ? users 
    : users.filter(u => u.id === selectedUser);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
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
              <SelectItem value="productivity">By Productivity</SelectItem>
              <SelectItem value="consistency">By Consistency</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredUsers.length}</div>
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
            <div className="text-2xl font-bold">
              {Math.round(filteredUsers.reduce((sum, u) => sum + u.totalHours, 0) * 100) / 100}
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
              {filteredUsers.length > 0 
                ? Math.round(filteredUsers.reduce((sum, u) => sum + u.efficiency, 0) / filteredUsers.length * 100) / 100
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Actual vs estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Consistency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredUsers.length > 0 
                ? Math.round(filteredUsers.reduce((sum, u) => sum + u.workPattern.consistency, 0) / filteredUsers.length * 100) / 100
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Work consistency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Analytics</CardTitle>
          <CardDescription>
            Detailed breakdown of user productivity and work patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Productivity</TableHead>
                  <TableHead>Consistency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="font-medium">{Math.round(user.totalHours * 100) / 100}h</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(user.avgHoursPerDay * 100) / 100}/day
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.projectCount}</TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="font-medium">{user.completedTasks}/{user.taskCount}</div>
                        <Progress 
                          value={(user.completedTasks / user.taskCount) * 100} 
                          className="w-16 mt-1" 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={getEfficiencyColor(user.efficiency)}>
                        {Math.round(user.efficiency * 100) / 100}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={getProductivityColor(user.productivity)}>
                        {Math.round(user.productivity * 100) / 100}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={getConsistencyColor(user.workPattern.consistency)}>
                        {user.workPattern.consistency}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No user data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Work Pattern for Selected User */}
      {selectedUser !== 'all' && filteredUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Pattern - {filteredUsers[0].name}</CardTitle>
              <CardDescription>
                Productivity insights and work habits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{formatDate(filteredUsers[0].workPattern.peakDay)}</div>
                  <div className="text-sm text-muted-foreground">Peak Day</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{formatHour(filteredUsers[0].workPattern.peakHour)}</div>
                  <div className="text-sm text-muted-foreground">Peak Hour</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{filteredUsers[0].workPattern.avgSessionLength}h</div>
                  <div className="text-sm text-muted-foreground">Avg Session</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{filteredUsers[0].workPattern.totalSessions}</div>
                  <div className="text-sm text-muted-foreground">Total Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Breakdown</CardTitle>
              <CardDescription>
                Time allocation across projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers[0].projectBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {filteredUsers[0].projectBreakdown.map((project) => (
                    <div key={project.projectId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{project.projectName}</div>
                        <div className="text-sm text-muted-foreground">
                          {project.completedTasks}/{project.tasks} tasks
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{project.hours}h</div>
                        <div className="text-xs text-muted-foreground">
                          {project.efficiency}% efficiency
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No project data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
