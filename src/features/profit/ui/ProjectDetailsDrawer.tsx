import React, { useMemo, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, X } from 'lucide-react';
import { ProjectProfit, UserProjectProfit } from '../services/profitService';
import { exportUserProjectProfitToCSV } from '@/shared/utils/csvExportProfit';
import { useToast } from '@/hooks/use-toast';
import { useUserProjectProfit } from '../hooks/useProfit';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { profitService } from '../services/profitService';
import { useQuery } from '@tanstack/react-query';

interface ProjectDetailsDrawerProps {
  project: ProjectProfit | null;
  users?: UserProjectProfit[];
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const BRAND_PRIMARY = '#E90E1D';
const CHART_COLORS = {
  revenue: '#10B981', // Green
  cost: '#EF4444', // Red
  profit: '#3B82F6', // Blue
};

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: CHART_COLORS.revenue,
  },
  cost: {
    label: 'Cost',
    color: CHART_COLORS.cost,
  },
  profit: {
    label: 'Profit',
    color: CHART_COLORS.profit,
  },
} as const;

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  project,
  users: propUsers,
  isLoading: propIsLoading,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const [isMonthWise, setIsMonthWise] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(subMonths(new Date(), 1))); // Default to last month

  // Fetch user cost data (overall or month-wise)
  const { data: fetchedUsers = [], isLoading: fetchedIsLoading } = useUserProjectProfit(
    project?.project_id || null,
    isMonthWise ? selectedMonth : null
  );

  // Fetch project cost per month (excluding current month)
  const { data: projectCostPerMonth = [], isLoading: isLoadingCostPerMonth } = useQuery({
    queryKey: ['profit', 'project-cost-per-month', project?.project_id],
    queryFn: () => {
      if (!project?.project_id) throw new Error('Project ID is required');
      return profitService.getProjectCostPerMonth(project.project_id, 6);
    },
    enabled: !!project?.project_id,
    staleTime: 30000,
  });

  // Use fetched data if available, otherwise use prop data
  const users = propUsers !== undefined ? propUsers : fetchedUsers;
  const isLoading = propIsLoading !== undefined ? propIsLoading : fetchedIsLoading;

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare chart data for financial overview
  // Show Revenue breakdown: Cost and Profit as portions of Revenue
  const financialChartData = useMemo(() => {
    if (!project) return [];
    
    const revenue = project.project_revenue || 0;
    const cost = Math.abs(project.project_total_cost || 0);
    const profit = project.profit || 0;

    // If no revenue, show cost and profit comparison
    if (revenue === 0 && cost === 0 && profit === 0) {
      return [];
    }

    const data = [];
    
    // Show cost as portion of revenue (or standalone if no revenue)
    if (cost > 0) {
      data.push({ 
        name: 'Cost', 
        value: cost, 
        color: CHART_COLORS.cost 
      });
    }
    
    // Show profit (positive or negative)
    if (Math.abs(profit) > 0) {
      data.push({ 
        name: profit >= 0 ? 'Profit' : 'Loss', 
        value: Math.abs(profit), 
        color: profit >= 0 ? CHART_COLORS.profit : '#DC2626' // Darker red for loss
      });
    }

    // If we have revenue but no cost/profit data, show revenue
    if (revenue > 0 && data.length === 0) {
      data.push({ 
        name: 'Revenue', 
        value: revenue, 
        color: CHART_COLORS.revenue 
      });
    }

    return data;
  }, [project]);

  // Prepare cost per user pie chart data
  const costPerUserChartData = useMemo(() => {
    if (!users || users.length === 0) return [];

    // Generate colors for users (using a color palette)
    const userColors = [
      '#E90E1D', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6',
      '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F97316'
    ];

    return users
      .filter(user => user.user_cost > 0)
      .map((user, index) => ({
        name: user.user_name || 'Unknown User',
        value: user.user_cost,
        color: userColors[index % userColors.length],
      }))
      .sort((a, b) => b.value - a.value); // Sort by cost descending
  }, [users]);

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  const handleExportCSV = () => {
    try {
      if (!project) return;
      exportUserProjectProfitToCSV(users, project.name);
      toast({
        title: 'Export successful',
        description: `Exported ${users.length} user(s) to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export CSV',
        variant: 'destructive',
      });
    }
  };

  if (!project) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerHeader className="border-b border-border bg-card px-6 py-5">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <DrawerTitle className="text-2xl font-bold text-foreground">
                Project {project.name} Details
              </DrawerTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="rounded-lg hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-[14px] border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Revenue
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(project.project_revenue)}
              </p>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Total Cost
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(project.project_total_cost)}
              </p>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Profit
              </p>
              <p className="text-2xl font-bold">
                <span
                  className={
                    project.profit < 0
                      ? 'text-destructive'
                      : project.profit > 0
                      ? 'text-green-600'
                      : 'text-foreground'
                  }
                >
                  {formatCurrency(project.profit)}
                </span>
              </p>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Margin %
              </p>
              <p className="text-2xl font-bold">
                <span
                  className={
                    project.profit_margin_percent !== null && project.profit_margin_percent < 0
                      ? 'text-destructive'
                      : project.profit_margin_percent !== null && project.profit_margin_percent > 0
                      ? 'text-green-600'
                      : 'text-foreground'
                  }
                >
                  {project.profit_margin_percent !== null
                    ? `${formatNumber(project.profit_margin_percent)}%`
                    : '-'}
                </span>
              </p>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-6">
            {/* Financial Overview Section */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-foreground mb-6">Financial Overview</h3>
              
            {/* Charts in grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie Chart - Financial Breakdown */}
                <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
                  <h4 className="text-sm font-semibold mb-4 text-foreground">Financial Breakdown</h4>
                {financialChartData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">No financial data available</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financialChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            if (percent < 0.05) return ''; // Hide labels for very small segments
                            return `${name}\n${(percent * 100).toFixed(1)}%`;
                          }}
                          outerRadius={90}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {financialChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = financialChartData.reduce((sum, item) => sum + item.value, 0);
                              const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
                              return (
                                <div className="rounded-[14px] border border-border bg-card p-3 shadow-lg">
                                  <div className="grid gap-2">
                                    <div className="font-semibold text-foreground text-sm">{data.name}</div>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="h-2.5 w-2.5 rounded-full" 
                                        style={{ backgroundColor: data.color }} 
                                      />
                                      <span className="text-sm font-medium text-foreground">{formatCurrency(data.value)}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {percentage}% of total
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={40}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '8px' }}
                          formatter={(value, entry: any) => (
                            <span style={{ color: entry.color, fontSize: '12px', fontWeight: 500 }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </div>

              {/* Pie Chart - Cost Per User */}
              <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-foreground">Cost Per User</h4>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="user-cost-toggle" className="text-xs text-muted-foreground">
                      Overall
                    </Label>
                    <Switch
                      id="user-cost-toggle"
                      checked={isMonthWise}
                      onCheckedChange={setIsMonthWise}
                    />
                    <Label htmlFor="user-cost-toggle" className="text-xs text-muted-foreground">
                      Month-wise
                    </Label>
                  </div>
                </div>
                {isMonthWise && (
                  <div className="mb-4">
                    <Select
                      value={format(selectedMonth, 'yyyy-MM')}
                      onValueChange={(value) => {
                        const [year, month] = value.split('-').map(Number);
                        setSelectedMonth(new Date(year, month - 1));
                      }}
                    >
                      <SelectTrigger className="w-full rounded-[14px] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const monthDate = subMonths(new Date(), i + 1); // Start from last month (exclude current)
                          return (
                            <SelectItem
                              key={format(monthDate, 'yyyy-MM')}
                              value={format(monthDate, 'yyyy-MM')}
                            >
                              {format(monthDate, 'MMMM yyyy')}
                            </SelectItem>
                          );
                        }).reverse()}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isLoading ? (
                  <div className="h-[280px] flex items-center justify-center rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Loading user data...</p>
                  </div>
                ) : costPerUserChartData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">No user cost data available</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costPerUserChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            if (percent < 0.05) return ''; // Hide labels for very small segments
                            return `${name}\n${(percent * 100).toFixed(1)}%`;
                          }}
                          outerRadius={90}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {costPerUserChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = costPerUserChartData.reduce((sum, item) => sum + item.value, 0);
                              const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
                              return (
                                <div className="rounded-[14px] border border-border bg-card p-3 shadow-lg">
                                  <div className="grid gap-2">
                                    <div className="font-semibold text-foreground text-sm">{data.name}</div>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="h-2.5 w-2.5 rounded-full" 
                                        style={{ backgroundColor: data.color }} 
                                      />
                                      <span className="text-sm font-medium text-foreground">{formatCurrency(data.value)}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {percentage}% of total cost
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={40}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '8px' }}
                          formatter={(value, entry: any) => (
                            <span style={{ color: entry.color, fontSize: '12px', fontWeight: 500 }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </div>

              {/* Bar Chart - Project Cost Per Month */}
              <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
                <h4 className="text-sm font-semibold mb-4 text-foreground">Project Cost Per Month</h4>
                {isLoadingCostPerMonth ? (
                  <div className="h-[280px] flex items-center justify-center rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Loading cost data...</p>
                  </div>
                ) : projectCostPerMonth.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">No cost data available</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectCostPerMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="monthLabel" 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                            return `₹${value}`;
                          }}
                        />
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-[14px] border border-border bg-card p-3 shadow-lg">
                                  <div className="grid gap-2">
                                    {payload.map((entry: any, index: number) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <div 
                                          className="h-2.5 w-2.5 rounded-full" 
                                          style={{ backgroundColor: entry.color }} 
                                        />
                                        <span className="text-sm text-muted-foreground">{entry.name}:</span>
                                        <span className="text-sm font-semibold text-foreground">{formatCurrency(entry.value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="cost" 
                          fill={CHART_COLORS.cost} 
                          radius={[14, 14, 0, 0]}
                          name="Cost"
                          opacity={0.9}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className="border-t border-border bg-card px-6 py-4 flex items-center justify-end gap-3">
          <Button 
            onClick={handleExportCSV} 
            variant="outline" 
            disabled={users.length === 0}
            className="rounded-[14px] border-border"
          >
            <Download className="h-4 w-4 mr-2" />
            Export User Breakdown
          </Button>
          <Button 
            onClick={onClose} 
            className="rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            Close
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

