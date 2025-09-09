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
  CalendarDays
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const [timeRange, setTimeRange] = useState('week');
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
      
      // Get date range based on selection
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      switch (timeRange) {
        case 'day':
          // Today only - from start of today to end of today
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'week':
          // This week - from start of current week to end of current week
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
          endOfWeek.setHours(23, 59, 59, 999);
          
          startDate = startOfWeek;
          endDate = endOfWeek;
          break;
        case 'month':
          // This month - from start of current month to end of current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case 'quarter':
          // This quarter - from start of current quarter to end of current quarter
          const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
          break;
        case 'year':
          // This year - from start of current year to end of current year
          startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        default:
          // Default to this week
          const defaultStartOfWeek = new Date(now);
          defaultStartOfWeek.setDate(now.getDate() - now.getDay());
          defaultStartOfWeek.setHours(0, 0, 0, 0);
          
          const defaultEndOfWeek = new Date(defaultStartOfWeek);
          defaultEndOfWeek.setDate(defaultStartOfWeek.getDate() + 6);
          defaultEndOfWeek.setHours(23, 59, 59, 999);
          
          startDate = defaultStartOfWeek;
          endDate = defaultEndOfWeek;
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
          projectCount: userPerf?.projectCount || 0
        };
      }).sort((a, b) => b.totalHours - a.totalHours);

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
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
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
  }, [timeRange]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Performance insights and productivity metrics for {getTimeRangeLabel().toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
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
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analyticsData.billableHours}h</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.totalHours > 0 ? Math.round((analyticsData.billableHours / analyticsData.totalHours) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageHoursPerUser}h</div>
            <p className="text-xs text-muted-foreground">
              Per user average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Task completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Performance</TabsTrigger>
          <TabsTrigger value="projects">Project Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab - High-level insights and key metrics */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analyticsData.totalProjects}</div>
                  <div className="text-sm text-muted-foreground">Total Projects</div>
                  <div className="text-xs text-blue-600">
                    Active projects
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analyticsData.billableHours.toFixed(1)}h</div>
                  <div className="text-sm text-muted-foreground">Billable Hours</div>
                  <div className="text-xs text-green-600">
                    {analyticsData.totalHours > 0 ? Math.round((analyticsData.billableHours / analyticsData.totalHours) * 100) : 0}% of total
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analyticsData.activeUsers}</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                  <div className="text-xs text-purple-600">
                    {analyticsData.averageHoursPerUser.toFixed(1)}h avg per user
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analyticsData.completionRate.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                  <div className="text-xs text-orange-600">
                    Task completion
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Time Distribution Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Time Distribution Overview
              </CardTitle>
              <CardDescription>High-level breakdown of billable vs non-billable hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="flex justify-center">
                  <PieChartComponent 
                    data={[
                      { 
                        label: 'Billable', 
                        value: analyticsData.billableHours, 
                        color: '#10b981' 
                      },
                      { 
                        label: 'Non-billable', 
                        value: analyticsData.nonBillableHours, 
                        color: '#f59e0b' 
                      }
                    ]} 
                    size={200}
                  />
                </div>
                
                {/* Legend and Details */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground mb-3">
                    Billable vs Non-billable Breakdown
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="font-medium">Billable Hours</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{analyticsData.billableHours.toFixed(1)}h</div>
                        <div className="text-sm text-muted-foreground">
                          {analyticsData.totalHours > 0 ? Math.round((analyticsData.billableHours / analyticsData.totalHours) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={analyticsData.totalHours > 0 ? (analyticsData.billableHours / analyticsData.totalHours) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                        <span className="font-medium">Non-billable Hours</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{analyticsData.nonBillableHours.toFixed(1)}h</div>
                        <div className="text-sm text-muted-foreground">
                          {analyticsData.totalHours > 0 ? Math.round((analyticsData.nonBillableHours / analyticsData.totalHours) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={analyticsData.totalHours > 0 ? (analyticsData.nonBillableHours / analyticsData.totalHours) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Projects Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Projects Summary
              </CardTitle>
              <CardDescription>Top 6 performing projects with key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.projectMetrics.slice(0, 6).map((project) => (
                  <div key={project.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{project.name}</h4>
                        <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'} className="text-xs mt-1">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Hours</span>
                        <span className="font-medium">{project.totalHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Users</span>
                        <span className="font-medium">{project.userCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Completion</span>
                        <span className="font-medium">{project.completionRate.toFixed(0)}%</span>
                      </div>
                      <Progress value={project.completionRate} className="h-2 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Performance Tab - Grid layout */}
        <TabsContent value="users" className="space-y-6">
          {/* User Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Performance Overview
              </CardTitle>
              <CardDescription>All users with billable and non-billable hours breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.allUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleUserClick(user)}
                  >
                    {/* User Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                        <span className="text-sm font-semibold text-primary">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{user.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </div>
                    
                    {/* Total Hours */}
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-primary">{user.totalHours.toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                    
                    {/* Bar Chart for Hours */}
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden mb-3">
                      {/* Billable Hours Bar */}
                      <div 
                        className="absolute left-0 top-0 h-full bg-green-500 rounded-l-full"
                        style={{ 
                          width: `${user.totalHours > 0 ? (user.billableHours / user.totalHours) * 100 : 0}%` 
                        }}
                      ></div>
                      {/* Non-billable Hours Bar */}
                      <div 
                        className="absolute top-0 h-full bg-orange-500 rounded-r-full"
                        style={{ 
                          left: `${user.totalHours > 0 ? (user.billableHours / user.totalHours) * 100 : 0}%`,
                          width: `${user.totalHours > 0 ? (user.nonBillableHours / user.totalHours) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    
                    {/* Hour Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-semibold text-green-600">{user.billableHours.toFixed(1)}h</div>
                        <div className="text-xs text-muted-foreground">Billable</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="font-semibold text-orange-600">{user.nonBillableHours.toFixed(1)}h</div>
                        <div className="text-xs text-muted-foreground">Non-billable</div>
                      </div>
                    </div>
                    
                    {/* Additional Stats */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Projects: {user.projectCount}</span>
                        <span>Efficiency: {user.efficiency.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Analytics Tab - Comprehensive project insights */}
        <TabsContent value="projects" className="space-y-6">
          {/* Project Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Project Performance Overview
              </CardTitle>
              <CardDescription>All projects with detailed metrics and billable/non-billable hours breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.projectMetrics.map((project) => (
                  <div key={project.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{project.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">
                            {project.status}
                          </Badge>
                          {project.totalHours === 0 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No work logs
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Hours</span>
                        <span className="font-medium">
                          {project.totalHours > 0 ? `${project.totalHours.toFixed(1)}h` : '0h'}
                        </span>
                      </div>
                      {project.totalHours > 0 ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Billable</span>
                            <span className="font-medium text-green-600">{project.billableHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-orange-600">Non-billable</span>
                            <span className="font-medium text-orange-600">{(project.totalHours - project.billableHours).toFixed(1)}h</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          No time tracking data available
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>Users</span>
                        <span className="font-medium">{project.userCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Completion</span>
                        <span className="font-medium">{project.completionRate.toFixed(0)}%</span>
                      </div>
                      <Progress value={project.completionRate} className="h-2 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
              
              {analyticsData.projectMetrics.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No projects found in the selected time range.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Time Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Project Time Distribution
              </CardTitle>
              <CardDescription>Visual breakdown of hours by project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="flex justify-center">
                  <PieChartComponent 
                    data={analyticsData.projectMetrics.slice(0, 8).map((project, index) => ({
                      label: project.name,
                      value: project.totalHours,
                      color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5a2b', '#6366f1'][index % 8]
                    }))} 
                    size={200}
                  />
                </div>
                
                {/* Legend and Details */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground mb-3">
                    Top Projects by Hours
                  </div>
                  
                  {analyticsData.projectMetrics.slice(0, 8).map((project, index) => {
                    const total = analyticsData.projectMetrics.reduce((sum, p) => sum + p.totalHours, 0);
                    const percentage = total > 0 ? (project.totalHours / total) * 100 : 0;
                    const color = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5a2b', '#6366f1'][index % 8];
                    
                    return (
                      <div key={project.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="font-medium">{project.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{project.totalHours.toFixed(1)}h</div>
                            <div className="text-sm text-muted-foreground">
                              {percentage.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Project Contributors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Project Contributors Details
              </CardTitle>
              <CardDescription>Detailed breakdown of contributors for each project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.projectMetrics.slice(0, 5).map((project) => (
                  <div key={project.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{project.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>
                            {project.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {project.userCount} users
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {project.contributors.length} contributors
                          </Badge>
                          {project.totalHours === 0 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No work logs
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{project.totalHours.toFixed(1)}h</div>
                        <div className="text-sm text-muted-foreground">
                          {project.billableHours.toFixed(1)}h billable
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Completion Rate</span>
                          <span>{project.completionRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={project.completionRate} className="h-2" />
                      </div>
                      
                      {/* Contributors Section */}
                      <div className="border-t pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleProjectExpansion(project.id)}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          {expandedProjects.has(project.id) ? 'Hide' : 'Show'} Contributors
                          {expandedProjects.has(project.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        
                        {expandedProjects.has(project.id) && (
                          <div className="mt-3 space-y-3">
                            <div className="text-sm font-medium text-muted-foreground">Project Contributors:</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {project.contributors.map((contributor) => (
                                <div key={contributor.userId} className="p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs">
                                        {contributor.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">{contributor.userName}</div>
                                      <div className="text-xs text-muted-foreground truncate">{contributor.userEmail}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <div className="text-muted-foreground">Hours</div>
                                      <div className="font-semibold">{contributor.hours.toFixed(1)}h</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Billable</div>
                                      <div className="font-semibold">{contributor.billableHours.toFixed(1)}h</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Tasks</div>
                                      <div className="font-semibold">{contributor.taskCount}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">Efficiency</div>
                                      <div className="font-semibold">{contributor.efficiency.toFixed(0)}%</div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span>Task Completion</span>
                                      <span>{contributor.completedTasks}/{contributor.taskCount}</span>
                                    </div>
                                    <Progress 
                                      value={contributor.taskCount > 0 ? (contributor.completedTasks / contributor.taskCount) * 100 : 0} 
                                      className="h-1"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {project.contributors.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                {project.totalHours === 0 
                                  ? 'No work logs or contributors found for this project' 
                                  : 'No contributors found for this project'
                                }
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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
