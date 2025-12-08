import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useAdminDailyHours } from '../hooks/useAdminDailyHours';
import { formatHoursToHHMM } from '@/shared/utils/formatHours';
import { AdminFilters } from '../services/adminService';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
        <p className="text-sm font-semibold text-foreground mb-2">
          {data.formattedDate}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Hours:</span>
            <span className="text-sm font-medium text-foreground">{formatHoursToHHMM(data.hours)}h</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-sm text-muted-foreground">Billable:</span>
            <span className="text-sm font-medium text-green-600">{formatHoursToHHMM(data.billableHours)}h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Non-billable:</span>
            <span className="text-sm font-medium text-muted-foreground">{formatHoursToHHMM(data.nonBillableHours)}h</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface DailyHoursCardProps {
  filters?: AdminFilters;
}

export const DailyHoursCard: React.FC<DailyHoursCardProps> = ({ filters }) => {
  const { data: chartData, isLoading, error } = useAdminDailyHours(filters);

  return (
    <Card className="rounded-[14px] border-2 shadow-lg bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground font-semibold">Daily Hours Logged</CardTitle>
        <p className="text-sm text-muted-foreground">Last 30 Days</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : error ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Error loading chart data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E7" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  stroke="#888888"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#888888' }}
                />
                <YAxis 
                  stroke="#888888"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#888888' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#888888" 
                  strokeWidth={2}
                  dot={{ fill: "#888888", r: 3 }}
                  activeDot={{ r: 5, fill: "#E90E1D" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

