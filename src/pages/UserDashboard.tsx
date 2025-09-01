import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, CheckSquare, Clock, Calendar, TrendingUp } from 'lucide-react';
import { TimeTracker } from '@/components/time-tracking/TimeTracker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string;
  note: string | null;
  projects: { name: string };
  tasks: { name: string } | null;
}

const UserDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    hoursThisWeek: 0,
    upcomingDeadlines: 0,
  });
  const { toast } = useToast();

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user's recent time entries
      const { data: timeEntries, error: timeError } = await supabase
        .from('work_logs')
        .select(`
          id,
          start_time,
          end_time,
          note,
          projects(name),
          tasks(name)
        `)
        .eq('user_id', profile?.id)
        .order('start_time', { ascending: false })
        .limit(5);

      if (timeError) {
        console.error('Error fetching time entries:', timeError);
        throw timeError;
      }

      setRecentEntries(timeEntries || []);

      // Calculate hours this week
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: weekEntries, error: weekError } = await supabase
        .from('work_logs')
        .select('start_time, end_time')
        .eq('user_id', profile?.id)
        .gte('start_time', weekStart.toISOString());

      if (weekError) {
        console.error('Error fetching week entries:', weekError);
        throw weekError;
      }

      const hoursThisWeek = weekEntries?.reduce((total, entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0) || 0;

      // Fetch user's tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_user_id', profile?.id);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      const totalTasks = tasks?.length || 0;
      const upcomingDeadlines = tasks?.filter(task => {
        // This would need deadline field in tasks table
        return false; // Placeholder
      }).length || 0;

      setStats({
        totalTasks,
        hoursThisWeek: Math.round(hoursThisWeek * 100) / 100,
        upcomingDeadlines,
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

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return `${Math.round(hours * 100) / 100}h`;
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
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name}</p>
            {profile?.specialization && (
              <p className="text-sm text-muted-foreground">{profile.specialization}</p>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks assigned to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hoursThisWeek}</div>
              <p className="text-xs text-muted-foreground">Hours logged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
              <p className="text-xs text-muted-foreground">Tasks due soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Tracker and Recent Entries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Time Tracker */}
          <TimeTracker />

          {/* Recent Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Time Entries
              </CardTitle>
              <CardDescription>
                Your recent work sessions
              </CardDescription>
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
              ) : recentEntries.length > 0 ? (
                <div className="space-y-3">
                  {recentEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{entry.projects.name}</div>
                        {entry.tasks && (
                          <div className="text-sm text-muted-foreground">{entry.tasks.name}</div>
                        )}
                        {entry.note && (
                          <div className="text-sm text-muted-foreground mt-1">{entry.note}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(entry.start_time)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatDuration(entry.start_time, entry.end_time)}</div>
                        <Badge variant="secondary" className="text-xs">
                          {entry.tasks ? 'Task' : 'Project'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No time entries yet.</p>
                  <p className="text-sm mt-2">Start tracking your work time to see entries here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>
              Tasks currently assigned to you
            </CardDescription>
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
            ) : stats.totalTasks > 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Task list will be implemented here.</p>
                <p className="text-sm mt-2">You have {stats.totalTasks} assigned tasks.</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tasks assigned yet.</p>
                <p className="text-sm mt-2">Tasks assigned by project managers will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserDashboard;