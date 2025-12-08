import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ProjectMonthlyProfit } from '../services/profitService';
import { cn } from '@/lib/utils';

interface ProjectMonthlyProfitChartProps {
  data: ProjectMonthlyProfit[];
}

const BRAND_PRIMARY = '#E90E1D';
const COST_COLOR = '#EF4444';
const PROFIT_COLOR = '#10B981';
const AXIS_COLOR = '#6B7280';
const GRID_COLOR = '#E7E7E7';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: BRAND_PRIMARY,
  },
  cost: {
    label: 'Cost',
    color: COST_COLOR,
  },
  profit: {
    label: 'Profit',
    color: PROFIT_COLOR,
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

export const ProjectMonthlyProfitChart: React.FC<ProjectMonthlyProfitChartProps> = ({ data }) => {
  return (
    <Card className="rounded-[14px] border-2 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Monthly Profit Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey="month_start"
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                tickFormatter={formatCurrency}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <div className="space-y-2">
                          {payload.map((entry, index) => {
                            const value = typeof entry.value === 'number' ? entry.value : 0;
                            return (
                              <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {entry.name}:
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-foreground">
                                  {formatCurrency(value)}
                                </span>
                              </div>
                            );
                          })}
                          {payload[0]?.payload?.profit_margin !== null &&
                            payload[0]?.payload?.profit_margin !== undefined && (
                              <div className="pt-2 border-t border-border">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Margin:
                                  </span>
                                  <span
                                    className={cn(
                                      'text-sm font-bold',
                                      payload[0].payload.profit_margin >= 0
                                        ? 'text-green-700'
                                        : 'text-red-700'
                                    )}
                                  >
                                    {payload[0].payload.profit_margin >= 0 ? '+' : ''}
                                    {payload[0].payload.profit_margin.toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Bar
                dataKey="revenue"
                fill={BRAND_PRIMARY}
                fillOpacity={0.7}
                radius={[8, 8, 0, 0]}
                name="Revenue"
              />
              <Bar
                dataKey="cost"
                fill={COST_COLOR}
                fillOpacity={0.7}
                radius={[8, 8, 0, 0]}
                name="Cost"
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke={PROFIT_COLOR}
                strokeWidth={3}
                dot={{ fill: PROFIT_COLOR, r: 5 }}
                activeDot={{ r: 7 }}
                name="Profit"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

