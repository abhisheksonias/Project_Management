import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useCompanyProfitMonthly } from '../hooks/useProfit';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export const CompanyMonthlyProfitCard: React.FC = () => {
  const { data: monthlyData, isLoading } = useCompanyProfitMonthly();

  // Format data for chart (limit to last 12 months, reverse for chronological order)
  const chartData = React.useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData
      .slice(0, 12)
      .reverse()
      .map((row) => ({
        month: format(new Date(row.month_start), 'MMM yyyy'),
        revenue: row.company_revenue,
        cost: row.company_cost,
        profit: row.profit,
        profit_margin: row.profit_margin_percent,
      }));
  }, [monthlyData]);

  // Calculate totals for summary
  const totals = React.useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return null;
    return monthlyData.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.company_revenue,
        cost: acc.cost + row.company_cost,
        profit: acc.profit + row.profit,
      }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [monthlyData]);

  if (isLoading) {
    return (
      <Card className="rounded-[14px] border-2 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Monthly Company Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <Card className="rounded-[14px] border-2 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Monthly Company Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-sm text-muted-foreground">No monthly profit data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px] border-2 shadow-lg bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Monthly Profit Trend</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last 12 months</p>
          </div>
          {totals && (
            <div className="flex items-center gap-2">
              {totals.profit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-700" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-700" />
              )}
              <span
                className={cn(
                  'text-base font-bold',
                  totals.profit >= 0 ? 'text-green-700' : 'text-red-700'
                )}
              >
                {formatCurrency(totals.profit)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey="month"
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

