import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { HoursByProjectData } from '../services/efficiencyService';
import { Skeleton } from '@/components/ui/skeleton';

interface HoursByProjectChartProps {
  data: HoursByProjectData[] | undefined;
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

export const HoursByProjectChart: React.FC<HoursByProjectChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="rounded-[14px] border border-secondary/50 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Hours by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full rounded-[12px] bg-secondary/60" />
        </CardContent>
      </Card>
    );
  }

  // Limit to top 10 projects for better readability
  const displayData = (data || []).slice(0, 10);

  return (
    <Card className="rounded-[14px] border border-secondary/50 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Hours by Project</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                type="number"
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="projectName"
                stroke={AXIS_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                width={120}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const entry = payload[0].payload as HoursByProjectData;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2 text-sm">
                          <div className="font-medium text-foreground">{entry.projectName}</div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND_PRIMARY }} />
                            <span>Hours: {payload[0].value?.toFixed(1) || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="hours" fill={BRAND_PRIMARY} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

