import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { DailyHoursData } from '../services/efficiencyService';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyHoursChartProps {
  data: DailyHoursData[] | undefined;
  isLoading: boolean;
}

const BRAND_PRIMARY = '#E90E1D';
const AXIS_COLOR = '#6B7280';
const GRID_COLOR = '#E7E7E7';

const chartConfig = {
  hours: {
    label: 'Hours',
    color: BRAND_PRIMARY,
  },
} as const;

export const DailyHoursChart: React.FC<DailyHoursChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] border border-secondary/50 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Daily Hours (Selected User)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full rounded-[12px] bg-secondary/60" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px] border border-secondary/50 bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Daily Hours (Selected User)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey="date"
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                domain={[0, 'dataMax']}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const rawValue = payload[0].value;
                    const numericValue =
                      typeof rawValue === 'number' ? rawValue : Number(rawValue);

                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND_PRIMARY }} />
                            <span className="text-sm font-medium text-muted-foreground">
                              Hours: {Number.isFinite(numericValue) ? numericValue.toFixed(1) : '0.0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke={BRAND_PRIMARY}
                strokeWidth={3}
                dot={{ fill: BRAND_PRIMARY, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

