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

const chartConfig = {
  hours: {
    label: 'Hours',
    color: '#FFB800',
  },
} as const;

export const DailyHoursChart: React.FC<DailyHoursChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] shadow-md bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Daily Hours (Selected User)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full bg-gray-700/50" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px] shadow-md bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Daily Hours (Selected User)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                domain={[0, 'dataMax']}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#FFB800]" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Hours: {payload[0].value?.toFixed(1) || 0}
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
                stroke="#FFB800"
                strokeWidth={3}
                dot={{ fill: '#FFB800', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

