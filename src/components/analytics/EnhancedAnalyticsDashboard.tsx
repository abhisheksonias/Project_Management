import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity,
  Target,
  DollarSign,
  Zap,
  Award,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  User,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  CalendarDays,
  UserX,
  UserCheck,
  MoreVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFilter } from '@/contexts/FilterContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { UserPerformanceModal } from './UserPerformanceModal';

interface AnalyticsData {
  totalProjects: number;
  totalUsers: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  averageHoursPerUser: number;
  completionRate: number;
  activeUsers: number;
  topPerformers: UserPerformance[];
  allUsers: UserPerformance[];
  projectMetrics: ProjectMetric[];
  timeDistribution: TimeDistribution;
  productivityTrends: ProductivityTrend[];
}

interface UserPerformance {
  id: string;
  name: string;
  email: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  efficiency: number;
  projectCount: number;
  avatar?: string;
  is_active?: boolean;
  rank?: string;
}

interface ProjectMetric {
  id: string;
  name: string;
  status: string;
  totalHours: number;
  billableHours: number;
  userCount: number;
  completionRate: number;
  progress: number;
  contributors: ProjectContributor[];
}

interface ProjectContributor {
  userId: string;
  userName: string;
  userEmail: string;
  hours: number;
  billableHours: number;
  taskCount: number;
  completedTasks: number;
  efficiency: number;
}

interface TimeDistribution {
  billable: number;
  nonBillable: number;
  byProject: Array<{
    projectName: string;
    hours: number;
    percentage: number;
  }>;
}

interface ProductivityTrend {
  date: string;
  hours: number;
  users: number;
  efficiency: number;
}

interface ChartFilters {
  timeDistribution: {
    type: 'billable' | 'project' | 'user' | 'day';
    selectedProjects: string[];
    selectedUsers: string[];
    dateRange: {
      from: Date | null;
      to: Date | null;
    };
  };
  projectBreakdown: {
    type: 'hours' | 'users' | 'completion';
    selectedProjects: string[];
    dateRange: {
      from: Date | null;
      to: Date | null;
    };
  };
}

export const EnhancedAnalyticsDashboard: React.FC = () => {
  const { filterValue, getDateRange } = useFilter();
  const { profile } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalProjects: 0,
    totalUsers: 0,
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    averageHoursPerUser: 0,
    completionRate: 0,
    activeUsers: 0,
    topPerformers: [],
    allUsers: [],
    projectMetrics: [],
    timeDistribution: { billable: 0, nonBillable: 0, byProject: [] },
    productivityTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [chartFilters, setChartFilters] = useState<ChartFilters>({
    timeDistribution: {
      type: 'billable',
      selectedProjects: [],
      selectedUsers: [],
      dateRange: { from: null, to: null }
    },
    projectBreakdown: {
      type: 'hours',
      selectedProjects: [],
      dateRange: { from: null, to: null }
    }
  });
  const [availableProjects, setAvailableProjects] = useState<Array<{id: string, name: string}>>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string}>>([]);
  const [selectedUser, setSelectedUser] = useState<UserPerformance | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const { toast } = useToast();

  // Pie Chart Component
  const PieChartComponent: React.FC<{ data: Array<{ label: string; value: number; color: string }>; size?: number }> = ({ 
    data, 
    size = 200 
  }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const startAngle = (cumulativePercentage / 100) * 360;
            const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
            
            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;
            
            const radius = size / 2 - 10;
            const centerX = size / 2;
            const centerY = size / 2;
            
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);
            
            const largeArcFlag = percentage > 50 ? 1 : 0;
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            cumulativePercentage += percentage;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{total.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </div>
    );
  };

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const updateChartFilter = (chartType: 'timeDistribution' | 'projectBreakdown', filterType: string, value: any) => {
    setChartFilters(prev => ({
      ...prev,
      [chartType]: {
        ...prev[chartType],
        [filterType]: value
      }
    }));
  };

  const clearChartFilters = (chartType: 'timeDistribution' | 'projectBreakdown') => {
    setChartFilters(prev => ({
      ...prev,
      [chartType]: {
        ...prev[chartType],
        selectedProjects: [],
        selectedUsers: [],
        dateRange: { from: null, to: null }
      }
    }));
  };

  const handleUserClick = (user: UserPerformance) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setSelectedUser(null);
  };

  const deactivateUser = async (userId: string, userName: string) => {
    try {
      console.log('Attempting to deactivate user:', { userId, userName });
      console.log('Current user profile:', profile);
      console.log('Current user role:', profile?.role);
      
      // Check if current user is admin
      if (profile?.role !== 'Admin') {
        toast({
          title: 'Access Denied',
          description: 'Only administrators can deactivate users.',
          variant: 'destructive',
        });
        return;
      }

      // Use direct update method (since RPC functions might not be available)
      console.log('Using direct update method for user deactivation');
      const updateResult = await supabase
        .from('users')
        .update({ is_active: false } as any)
        .eq('id', userId);
      
      const data = updateResult.data;
      const error = updateResult.error;
      console.log('Direct update response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: 'User Deactivated',
        description: `${userName} has been deactivated successfully.`,
      });

      // Refresh the analytics data
      fetchAnalyticsData();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        title: 'Error',
        description: `Failed to deactivate user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const reactivateUser = async (userId: string, userName: string) => {
    try {
      console.log('Attempting to reactivate user:', { userId, userName });
      console.log('Current user profile:', profile);
      console.log('Current user role:', profile?.role);
      
      // Check if current user is admin
      if (profile?.role !== 'Admin') {
        toast({
          title: 'Access Denied',
          description: 'Only administrators can reactivate users.',
          variant: 'destructive',
        });
        return;
      }

      // Use direct update method (since RPC functions might not be available)
      console.log('Using direct update method for user reactivation');
      const updateResult = await supabase
        .from('users')
        .update({ is_active: true } as any)
        .eq('id', userId);
      
      const data = updateResult.data;
      const error = updateResult.error;
      console.log('Direct update response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: 'User Reactivated',
        description: `${userName} has been reactivated successfully.`,
      });

      // Refresh the analytics data
      fetchAnalyticsData();
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast({
        title: 'Error',
        description: `Failed to reactivate user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const getFilteredTimeDistributionData = () => {
    const { type, selectedProjects, selectedUsers, dateRange } = chartFilters.timeDistribution;
    
    if (type === 'billable') {
      return [
        { label: 'Billable', value: analyticsData.billableHours, color: '#10b981' },
        { label: 'Non-billable', value: analyticsData.nonBillableHours, color: '#f59e0b' }
      ];
    }
    
    if (type === 'project') {
      let projects = analyticsData.timeDistribution.byProject;
      
      if (selectedProjects.length > 0) {
        projects = projects.filter(p => selectedProjects.includes(p.projectName));
      }
      
      return projects.slice(0, 5).map((project, index) => ({
        label: project.projectName,
        value: project.hours,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 5]
      }));
    }
    
    if (type === 'user') {
      let users = analyticsData.allUsers;
      
      if (selectedUsers.length > 0) {
        users = users.filter(u => selectedUsers.includes(u.id));
      }
      
      return users.slice(0, 8).map((user, index) => ({
        label: user.name,
        value: user.totalHours,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5a2b', '#6366f1'][index % 8]
      }));
    }
    
    return [];
  };

  const getFilteredProjectBreakdownData = () => {
    const { type, selectedProjects } = chartFilters.projectBreakdown;
    
    let projects = analyticsData.timeDistribution.byProject;
    
    if (selectedProjects.length > 0) {
      projects = projects.filter(p => selectedProjects.includes(p.projectName));
    }
    
    if (type === 'hours') {
      return projects.slice(0, 5).map((project, index) => ({
        label: project.projectName,
        value: project.hours,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 5]
      }));
    }
    
    if (type === 'users') {
      return projects.slice(0, 5).map((project, index) => {
        const projectMetric = analyticsData.projectMetrics.find(p => p.name === project.projectName);
        return {
          label: project.projectName,
          value: projectMetric?.userCount || 0,
          color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 5]
        };
      });
    }
    
    if (type === 'completion') {
      return projects.slice(0, 5).map((project, index) => {
        const projectMetric = analyticsData.projectMetrics.find(p => p.name === project.projectName);
        return {
          label: project.projectName,
          value: projectMetric?.completionRate || 0,
          color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 5]
        };
      });
    }
    
    return [];
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Get date range from unified filter
      const dateRange = getDateRange();
      let startDate: Date;
      let endDate: Date;
      
      if (dateRange) {
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
      } else {
        // Fallback to today if no date range
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }

      // Fetch all data in parallel
      const [projectsResult, usersResult, workLogsResult, tasksResult] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('users').select('*').neq('role', 'Admin'),
        supabase
          .from('work_logs')
          .select(`
            *,
            users!inner(name, email, role),
            projects(name, status),
            tasks(name, type, status)
          `)
          .neq('users.role', 'Admin')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase.from('tasks').select('*')
      ]);

      const projects = projectsResult.data || [];
      const users = usersResult.data || [];
      const workLogs = workLogsResult.data || [];
      const tasks = tasksResult.data || [];

      // Calculate metrics
      const totalHours = workLogs.reduce((total, log) => {
        if (!log.hours) return total;
        const [hoursStr, minutesStr] = log.hours.split(':');
        return total + parseInt(hoursStr) + (parseInt(minutesStr) / 60);
      }, 0);

      const billableHours = workLogs.reduce((total, log) => {
        if (!log.hours || log.tasks?.type !== 'billable') return total;
        const [hoursStr, minutesStr] = log.hours.split(':');
        return total + parseInt(hoursStr) + (parseInt(minutesStr) / 60);
      }, 0);

      const nonBillableHours = totalHours - billableHours;
      const activeUsers = new Set(workLogs.map(log => log.user_id)).size;
      const averageHoursPerUser = activeUsers > 0 ? totalHours / activeUsers : 0;

      // Calculate completion rate
      const completedTasks = tasks.filter(task => task.status === 'Completed').length;
      const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

      // Calculate user performance
      const userPerformanceMap = new Map<string, UserPerformance>();
      workLogs.forEach(log => {
        if (!userPerformanceMap.has(log.user_id)) {
          userPerformanceMap.set(log.user_id, {
            id: log.user_id,
            name: log.users.name,
            email: log.users.email,
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            efficiency: 0,
            projectCount: 0
          });
        }
        
        const userPerf = userPerformanceMap.get(log.user_id)!;
        if (log.hours) {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          userPerf.totalHours += hours;
          
          if (log.tasks?.type === 'billable') {
            userPerf.billableHours += hours;
          } else {
            userPerf.nonBillableHours += hours;
          }
        }
      });

      // Calculate efficiency and project count for each user
      userPerformanceMap.forEach(userPerf => {
        const userTasks = tasks.filter(task => task.assigned_user_id === userPerf.id);
        const completedUserTasks = userTasks.filter(task => task.status === 'Completed').length;
        userPerf.efficiency = userTasks.length > 0 ? (completedUserTasks / userTasks.length) * 100 : 0;
        userPerf.projectCount = new Set(workLogs.filter(log => log.user_id === userPerf.id).map(log => log.project_id)).size;
      });

      const topPerformers = Array.from(userPerformanceMap.values())
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 5);

      // Get all users (including those with no work logs) excluding admins
      const allUsers = users.map(user => {
        const userPerf = userPerformanceMap.get(user.id);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          totalHours: userPerf?.totalHours || 0,
          billableHours: userPerf?.billableHours || 0,
          nonBillableHours: userPerf?.nonBillableHours || 0,
          efficiency: userPerf?.efficiency || 0,
          projectCount: userPerf?.projectCount || 0,
          is_active: (user as any).is_active !== false, // Default to true if null/undefined
          rank: user.rank
        };
      }).sort((a, b) => {
        // Sort active users first, then by total hours
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }
        return b.totalHours - a.totalHours;
      });

      // Calculate project metrics - Start with all projects from the projects table
      const projectMetricsMap = new Map<string, ProjectMetric>();
      const projectContributorsMap = new Map<string, Map<string, ProjectContributor>>();
      
      // Initialize all projects from the projects table
      projects.forEach(project => {
        projectMetricsMap.set(project.id, {
          id: project.id,
          name: project.name,
          status: project.status,
          totalHours: 0,
          billableHours: 0,
          userCount: 0,
          completionRate: 0,
          progress: 0,
          contributors: []
        });
        projectContributorsMap.set(project.id, new Map());
      });
      
      // Process work logs to add time tracking data
      workLogs.forEach(log => {
        if (!log.project_id || !log.projects) return;
        
        const projectMetric = projectMetricsMap.get(log.project_id);
        if (!projectMetric) return;
        
        const contributorsMap = projectContributorsMap.get(log.project_id)!;
        
        if (log.hours) {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          projectMetric.totalHours += hours;
          
          if (log.tasks?.type === 'billable') {
            projectMetric.billableHours += hours;
          }
        }
        
        // Track contributor data
        if (!contributorsMap.has(log.user_id)) {
          contributorsMap.set(log.user_id, {
            userId: log.user_id,
            userName: log.users.name,
            userEmail: log.users.email,
            hours: 0,
            billableHours: 0,
            taskCount: 0,
            completedTasks: 0,
            efficiency: 0
          });
        }
        
        const contributor = contributorsMap.get(log.user_id)!;
        if (log.hours) {
          const [hoursStr, minutesStr] = log.hours.split(':');
          const hours = parseInt(hoursStr) + (parseInt(minutesStr) / 60);
          contributor.hours += hours;
          
          if (log.tasks?.type === 'billable') {
            contributor.billableHours += hours;
          }
        }
      });

      // Calculate project completion rates, user counts, and contributor details for all projects
      projectMetricsMap.forEach(projectMetric => {
        const projectTasks = tasks.filter(task => task.project_id === projectMetric.id);
        const completedProjectTasks = projectTasks.filter(task => task.status === 'Completed').length;
        projectMetric.completionRate = projectTasks.length > 0 ? (completedProjectTasks / projectTasks.length) * 100 : 0;
        projectMetric.progress = projectMetric.completionRate;
        projectMetric.userCount = new Set(workLogs.filter(log => log.project_id === projectMetric.id).map(log => log.user_id)).size;
        
        // Add contributor details
        const contributorsMap = projectContributorsMap.get(projectMetric.id);
        if (contributorsMap) {
          contributorsMap.forEach(contributor => {
            // Calculate task counts and efficiency for each contributor
            const userTasks = projectTasks.filter(task => task.assigned_user_id === contributor.userId);
            contributor.taskCount = userTasks.length;
            contributor.completedTasks = userTasks.filter(task => task.status === 'Completed').length;
            contributor.efficiency = userTasks.length > 0 ? (contributor.completedTasks / userTasks.length) * 100 : 0;
          });
          
          projectMetric.contributors = Array.from(contributorsMap.values())
            .sort((a, b) => b.hours - a.hours);
        }
      });

      const projectMetrics = Array.from(projectMetricsMap.values())
        .sort((a, b) => b.totalHours - a.totalHours);

      // Set available projects and users for filters
      setAvailableProjects(projects.map(p => ({ id: p.id, name: p.name })));
      setAvailableUsers(users.map(u => ({ id: u.id, name: u.name })));

      // Calculate time distribution
      const timeDistribution = {
        billable: billableHours,
        nonBillable: nonBillableHours,
        byProject: projectMetrics
          .filter(project => project.totalHours > 0) // Only include projects with work logs for the chart
          .slice(0, 5)
          .map(project => ({
            projectName: project.name,
            hours: project.totalHours,
            percentage: totalHours > 0 ? (project.totalHours / totalHours) * 100 : 0
          }))
      };

      // Generate productivity trends (mock data for now)
      const productivityTrends: ProductivityTrend[] = [];
      const currentDate = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        productivityTrends.push({
          date: format(date, 'MMM dd'),
          hours: Math.random() * 40 + 20, // Mock data
          users: Math.floor(Math.random() * 5) + 3,
          efficiency: Math.random() * 30 + 70
        });
      }

      setAnalyticsData({
        totalProjects: projects.length,
        totalUsers: users.length,
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
        averageHoursPerUser: Math.round(averageHoursPerUser * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        activeUsers,
        topPerformers,
        allUsers,
        projectMetrics,
        timeDistribution,
        productivityTrends
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
  }, [filterValue]);

  const getTimeRangeLabel = () => {
    switch (filterValue.type) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      case 'custom': 
        if (filterValue.startDate && filterValue.endDate) {
          return `${format(filterValue.startDate, 'MMM dd')} - ${format(filterValue.endDate, 'MMM dd, yyyy')}`;
        }
        return 'Custom Range';
      default: return 'Today';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex gap-6">
          {/* Fixed Side Navigation */}
          <div className="flex flex-col gap-2 w-48 flex-shrink-0">
            <Button 
              variant={activeTab === 'users' ? 'default' : 'outline'}
              className={`justify-start ${activeTab === 'users' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              User Performance
            </Button>
            <Button 
              variant={activeTab === 'projects' ? 'default' : 'outline'}
              className={`justify-start ${activeTab === 'projects' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              Project Performance
            </Button>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 space-y-4">
            {/* User Performance Tab */}
            <TabsContent value="users" className="space-y-4">
              {/* Section Title */}
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">User Performance</h3>
                <div className="text-sm font-bold bg-green-100 rounded-md p-2 text-muted-foreground">
                  Star Performer - {analyticsData.topPerformers[0]?.name || 'No data available'} Bhai
                </div>
              </div>
              
              {/* User Performance Cards Grid */}
              <div className="space-y-6">
                {/* Active Users */}
                {analyticsData.allUsers.filter(user => user.is_active !== false).length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-gray-700">Active Users</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analyticsData.allUsers
                        .filter(user => user.is_active !== false)
                        .map((user, index) => (
                        <div 
                          key={user.id} 
                          className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer relative"
                          onClick={() => handleUserClick(user)}
                        >
                          {/* User Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                              <span className="text-sm font-semibold text-green-600">
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm flex items-center gap-2">
                                {user.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.rank || 'Designation'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-blue-600">
                                {Math.floor(user.totalHours)}:{String(Math.round((user.totalHours % 1) * 60)).padStart(2, '0')}
                              </div>
                              <div className="text-xs text-muted-foreground">Total Hours</div>
                            </div>
                          </div>
                          
                          {/* Admin Actions */}
                          {user.rank !== 'Admin' && profile?.role === 'Admin' && (
                            <div className="absolute top-2 right-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end">
                                  <div className="space-y-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deactivateUser(user.id, user.name);
                                      }}
                                    >
                                      <UserX className="h-4 w-4 mr-2" />
                                      Deactivate User
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                          
                          {/* Hour Breakdown */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 bg-green-100 rounded text-center">
                              <div className="text-sm font-semibold text-green-600">
                                {Math.floor(user.billableHours)}:{String(Math.round((user.billableHours % 1) * 60)).padStart(2, '0')}
                              </div>
                              <div className="text-xs text-muted-foreground">Billable Hours</div>
                            </div>
                            <div className="p-2 bg-red-100 rounded text-center">
                              <div className="text-sm font-semibold text-red-600">
                                {Math.floor(user.nonBillableHours)}:{String(Math.round((user.nonBillableHours % 1) * 60)).padStart(2, '0')}
                              </div>
                              <div className="text-xs text-muted-foreground">Non-Billable Hours</div>
                            </div>
                          </div>
                          
                          {/* Projects Contributed */}
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                              Projects Contributed - {user.projectCount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deactivated Users */}
                {analyticsData.allUsers.filter(user => user.is_active === false).length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-gray-700">Deactivated Users</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analyticsData.allUsers
                        .filter(user => user.is_active === false)
                        .map((user, index) => (
                        <div 
                          key={user.id} 
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer relative bg-gray-50 opacity-75"
                          onClick={() => handleUserClick(user)}
                        >
                          {/* User Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full">
                              <span className="text-sm font-semibold text-gray-500">
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm flex items-center gap-2">
                                {user.name}
                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-600">
                                  Deactivated
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.rank || 'Designation'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-blue-600">
                                {Math.floor(user.totalHours)}:{String(Math.round((user.totalHours % 1) * 60)).padStart(2, '0')}
                              </div>
                              <div className="text-xs text-muted-foreground">Total Hours</div>
                            </div>
                          </div>
                          
                          {/* Admin Actions */}
                          {profile?.role === 'Admin' && (
                            <div className="absolute top-2 right-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end">
                                  <div className="space-y-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        reactivateUser(user.id, user.name);
                                      }}
                                    >
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Reactivate User
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                          
                          {/* Hour Breakdown */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 bg-green-100 rounded text-center">
                              <div className="text-sm font-semibold text-green-600">
                                {Math.floor(user.billableHours)}:{String(Math.round((user.billableHours % 1) * 60)).padStart(2, '0')}
                              </div>
                              <div className="text-xs text-muted-foreground">Billable Hours</div>
                            </div>
                            <div className="p-2 bg-red-100 rounded text-center">
                              <div className="text-sm font-semibold text-red-600">
                                {Math.floor(user.nonBillableHours)}:{String(Math.round((user.nonBillableHours % 1) * 60)).padStart(2, '0')}
                              </div>
                              <div className="text-xs text-muted-foreground">Non-Billable Hours</div>
                            </div>
                          </div>
                          
                          {/* Projects Contributed */}
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                              Projects Contributed - {user.projectCount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
 
            {/* Project Performance Tab */}
            <TabsContent value="projects" className="space-y-4">
              {/* Section Title */}
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Project Performance</h3>
                <div className="text-sm font-bold bg-green-100 rounded-md p-2 text-muted-foreground">
                  Star Project - {analyticsData.projectMetrics[0]?.name || 'No project available'}
                </div>
              </div>
              
              {/* Project Performance Cards - User Performance Style */}
              <div className="space-y-6">
                {/* In Progress Projects */}
                {analyticsData.projectMetrics.filter(project => project.status !== 'Completed').length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-gray-700">In Progress Projects</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analyticsData.projectMetrics
                        .filter(project => project.status !== 'Completed')
                        .map((project) => (
                        <div 
                          key={project.id} 
                          className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer"
                        >
                          {/* Project Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                              <span className="text-sm font-semibold text-blue-600">
                                {project.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm">{project.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block bg-black text-white text-xs px-2 py-1 rounded">
                                  {project.status === 'Completed' ? 'Completed' : 'In progress'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-blue-600">
                                {project.totalHours > 0 ? `${Math.floor(project.totalHours)}:${String(Math.round((project.totalHours % 1) * 60)).padStart(2, '0')}` : '00:00'}
                              </div>
                              <div className="text-xs text-muted-foreground">Total Hours</div>
                            </div>
                          </div>
                          
                          {/* Hour Breakdown */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 bg-green-100 rounded text-center">
                              <div className="text-sm font-semibold text-green-600">
                                {project.totalHours > 0 ? `${Math.floor(project.billableHours)}:${String(Math.round((project.billableHours % 1) * 60)).padStart(2, '0')}` : '00:00'}
                              </div>
                              <div className="text-xs text-muted-foreground">Billable Hours</div>
                            </div>
                            <div className="p-2 bg-red-100 rounded text-center">
                              <div className="text-sm font-semibold text-red-600">
                                {project.totalHours > 0 ? `${Math.floor(project.totalHours - project.billableHours)}:${String(Math.round(((project.totalHours - project.billableHours) % 1) * 60)).padStart(2, '0')}` : '00:00'}
                              </div>
                              <div className="text-xs text-muted-foreground">Non-Billable Hours</div>
                            </div>
                          </div>
                          
                          {/* Contributors */}
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                              Contributors - {project.userCount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Projects */}
                {analyticsData.projectMetrics.filter(project => project.status === 'Completed').length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-gray-700">Completed Projects</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analyticsData.projectMetrics
                        .filter(project => project.status === 'Completed')
                        .map((project) => (
                        <div 
                          key={project.id} 
                          className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer"
                        >
                          {/* Project Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                              <span className="text-sm font-semibold text-green-600">
                                {project.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm">{project.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block bg-black text-white text-xs px-2 py-1 rounded">
                                  Completed
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-blue-600">
                                {project.totalHours > 0 ? `${Math.floor(project.totalHours)}:${String(Math.round((project.totalHours % 1) * 60)).padStart(2, '0')}` : '00:00'}
                              </div>
                              <div className="text-xs text-muted-foreground">Total Hours</div>
                            </div>
                          </div>
                          
                          {/* Hour Breakdown */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 bg-green-100 rounded text-center">
                              <div className="text-sm font-semibold text-green-600">
                                {project.totalHours > 0 ? `${Math.floor(project.billableHours)}:${String(Math.round((project.billableHours % 1) * 60)).padStart(2, '0')}` : '00:00'}
                              </div>
                              <div className="text-xs text-muted-foreground">Billable Hours</div>
                            </div>
                            <div className="p-2 bg-red-100 rounded text-center">
                              <div className="text-sm font-semibold text-red-600">
                                {project.totalHours > 0 ? `${Math.floor(project.totalHours - project.billableHours)}:${String(Math.round(((project.totalHours - project.billableHours) % 1) * 60)).padStart(2, '0')}` : '00:00'}
                              </div>
                              <div className="text-xs text-muted-foreground">Non-Billable Hours</div>
                            </div>
                          </div>
                          
                          {/* Contributors */}
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                              Contributors - {project.userCount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {analyticsData.projectMetrics.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No projects found in the selected time range.
                </div>
              )}
            </TabsContent>
           </div>
         </div>
       </Tabs>

      {/* User Performance Modal */}
      {selectedUser && (
        <UserPerformanceModal
          isOpen={isUserModalOpen}
          onClose={closeUserModal}
          user={selectedUser}
        />
      )}
    </div>
  );
};
