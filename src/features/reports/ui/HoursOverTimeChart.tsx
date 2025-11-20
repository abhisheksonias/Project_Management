import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, TooltipProps } from 'recharts';
import { HoursOverTime } from '../services/reportService';

interface HoursOverTimeChartProps {
  data: HoursOverTime[];
}

// Custom Tooltip component for timeline display
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const hours = data.value as number;
    const monthName = label || '';
    
    return (
      <div 
        className="bg-white border border-[#E5E7EB] rounded-[14px] shadow-lg p-4 min-w-[220px]"
        style={{ 
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '14px',
          padding: '12px 16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-900 border-b border-[#E7E7E7] pb-2">
            Timeline: {monthName}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-gray-600">Hours Logged:</span>
            <span className="text-lg font-bold text-[#E90E1D]">
              {hours.toFixed(1)}h
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#E7E7E7]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E90E1D]"></div>
              <span className="text-xs text-gray-500">
                User Activity Timeline
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const HoursOverTimeChart: React.FC<HoursOverTimeChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Hours Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[240px]">
            <p className="text-sm text-muted-foreground">No data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Hours Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#E90E1D', strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Area 
              type="monotone" 
              dataKey="hours" 
              stroke="#E90E1D" 
              fill="#E90E1D" 
              fillOpacity={0.3}
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

