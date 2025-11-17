import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { HoursByUserData } from '../services/projectEfficiencyService';
import { Skeleton } from '@/components/ui/skeleton';

interface HoursByUserChartProps {
  data: HoursByUserData[] | undefined;
  isLoading: boolean;
}

const chartConfig = {
  hours: {
    label: 'Hours',
    color: '#14B8A6',
  },
} as const;

export const HoursByUserChart: React.FC<HoursByUserChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] shadow-md bg-teal-50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Hours by Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full bg-teal-100/50" />
        </CardContent>
      </Card>
    );
  }

  // Limit to top 10 users for better readability
  const displayData = (data || []).slice(0, 10);

  return (
    <Card className="rounded-[14px] shadow-md bg-teal-50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Hours by Team Member</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="userName"
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                width={120}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as HoursByUserData;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{data.userName}</div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#14B8A6]" />
                            <span className="text-sm text-muted-foreground">
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
              <Bar dataKey="hours" fill="#14B8A6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

