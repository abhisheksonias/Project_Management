import React, { useMemo, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, X } from 'lucide-react';
import { ProjectProfit, UserProjectProfit } from '../services/profitService';
import { exportUserProjectProfitToCSV } from '@/shared/utils/csvExportProfit';
import { useToast } from '@/hooks/use-toast';
import { useUserProjectProfit, useProjectMonthlyTrend } from '../hooks/useProfit';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';

interface ProjectDetailsDrawerProps {
  project: ProjectProfit | null;
  users?: UserProjectProfit[];
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
  selectedMonth?: Date;
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
  selectedMonth: initialSelectedMonth,
}) => {
  const { toast } = useToast();
  const [isMonthWise, setIsMonthWise] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    initialSelectedMonth || new Date()
  );

  // Fetch user profit data based on toggle state
  const { data: fetchedUsers = [], isLoading: fetchedIsLoading } = useUserProjectProfit(
    project?.project_id || null,
    isMonthWise ? selectedMonth : null
  );

  // Fetch monthly trend data
  const { data: monthlyTrend = [], isLoading: isLoadingTrend } = useProjectMonthlyTrend(
    project?.project_id || null,
    6
  );

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
      <DrawerContent className="h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DrawerTitle className="text-2xl">Project {project.name} Details</DrawerTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-xl font-semibold mt-1">
                {formatCurrency(project.project_revenue)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-xl font-semibold mt-1">
                {formatCurrency(project.project_total_cost)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Profit</p>
              <p className="text-xl font-semibold mt-1">
                <span
                  className={
                    project.profit < 0
                      ? 'text-red-600'
                      : project.profit > 0
                      ? 'text-green-600'
                      : ''
                  }
                >
                  {formatCurrency(project.profit)}
                </span>
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Margin %</p>
              <p className="text-xl font-semibold mt-1">
                <span
                  className={
                    project.profit_margin_percent !== null && project.profit_margin_percent < 0
                      ? 'text-red-600'
                      : project.profit_margin_percent !== null && project.profit_margin_percent > 0
                      ? 'text-green-600'
                      : ''
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

        <div className="flex-1 overflow-y-auto p-6">
          {/* Financial Overview Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
            
            {/* Charts in single row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pie Chart - Current Breakdown */}
              <div className="rounded-[14px] border border-secondary/50 bg-card p-4">
              {financialChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No financial data available</p>
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
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
                              <div className="rounded-lg border bg-background p-3 shadow-sm">
                                <div className="grid gap-2 text-sm">
                                  <div className="font-medium text-foreground">{data.name}</div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <div 
                                      className="h-2 w-2 rounded-full" 
                                      style={{ backgroundColor: data.color }} 
                                    />
                                    <span>{formatCurrency(data.value)}</span>
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
                        height={36}
                        formatter={(value, entry: any) => (
                          <span style={{ color: entry.color, fontSize: '12px' }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
              </div>

              {/* Trend Chart - Monthly Performance */}
              <div className="rounded-[14px] border border-secondary/50 bg-card p-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">6-Month Trend</h4>
              {isLoadingTrend ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading trend data...</p>
                </div>
              ) : monthlyTrend.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No trend data available</p>
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.cost} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={CHART_COLORS.cost} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.profit} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={CHART_COLORS.profit} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E7" />
                      <XAxis 
                        dataKey="monthLabel" 
                        stroke="#6B7280"
                        tick={{ fill: '#6B7280', fontSize: 11 }}
                      />
                      <YAxis 
                        stroke="#6B7280"
                        tick={{ fill: '#6B7280', fontSize: 11 }}
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
                              <div className="rounded-lg border bg-background p-3 shadow-sm">
                                <div className="grid gap-2 text-sm">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <div 
                                        className="h-2 w-2 rounded-full" 
                                        style={{ backgroundColor: entry.color }} 
                                      />
                                      <span className="text-muted-foreground">{entry.name}:</span>
                                      <span className="font-medium">{formatCurrency(entry.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={CHART_COLORS.revenue} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={2}
                        name="Revenue"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cost" 
                        stroke={CHART_COLORS.cost} 
                        fill="url(#colorCost)" 
                        strokeWidth={2}
                        name="Cost"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke={CHART_COLORS.profit} 
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.profit, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Profit"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
              </div>
            </div>
          </div>

          {/* User Performance Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">User Performance</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="month-wise-toggle" className="text-sm text-muted-foreground">
                    Overall
                  </Label>
                  <Switch
                    id="month-wise-toggle"
                    checked={isMonthWise}
                    onCheckedChange={setIsMonthWise}
                  />
                  <Label htmlFor="month-wise-toggle" className="text-sm text-muted-foreground">
                    Month-wise
                  </Label>
                </div>
                {isMonthWise && (
                  <Select
                    value={format(selectedMonth, 'yyyy-MM')}
                    onValueChange={(value) => {
                      const [year, month] = value.split('-').map(Number);
                      setSelectedMonth(new Date(year, month - 1));
                    }}
                  >
                    <SelectTrigger className="w-[180px] rounded-[14px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthDate = subMonths(new Date(), i);
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
                )}
              </div>
            </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Revenue Share</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-md border p-12 text-center">
              <p className="text-muted-foreground">No user data available</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Revenue Share</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.user_name}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(user.user_hours)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(user.user_revenue_share)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(user.user_cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={user.user_profit < 0 ? 'destructive' : 'default'}
                        >
                          {formatCurrency(user.user_profit)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className="border-t p-4 flex justify-end gap-3">
          <Button onClick={handleExportCSV} variant="outline" disabled={users.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export User Breakdown
          </Button>
          <Button onClick={onClose} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Close
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

