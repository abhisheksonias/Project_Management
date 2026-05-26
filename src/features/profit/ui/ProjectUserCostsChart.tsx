import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ProjectUserCost } from '../services/profitService';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectUserCostsChartProps {
  data: ProjectUserCost[] | undefined;
  isLoading: boolean;
}

const BRAND_PRIMARY = '#E90E1D';
const AXIS_COLOR = '#6B7280';
const GRID_COLOR = '#E7E7E7';

const chartConfig = {
  cost: {
    label: 'Cost',
    color: BRAND_PRIMARY,
  },
} as const;

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

export const ProjectUserCostsChart: React.FC<ProjectUserCostsChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] border-2 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Cost per User</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="rounded-[14px] border-2 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Cost per User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">No user cost data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Truncate long names for better display
  const chartData = data.map((item) => ({
    ...item,
    displayName:
      item.user_name.length > 15
        ? `${item.user_name.substring(0, 15)}...`
        : item.user_name,
  }));

  return (
    <Card className="rounded-[14px] border-2 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Cost per User</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey="displayName"
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                tickFormatter={formatCurrency}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ProjectUserCost;
                    const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-muted-foreground">
                              User:
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {data.user_name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: BRAND_PRIMARY }}
                              />
                              <span className="text-sm font-medium text-muted-foreground">
                                Cost:
                              </span>
                            </div>
                            <span className="text-sm font-bold text-foreground">
                              {formatCurrency(value)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="total_user_cost"
                fill={BRAND_PRIMARY}
                fillOpacity={0.7}
                radius={[8, 8, 0, 0]}
                name="Cost"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

