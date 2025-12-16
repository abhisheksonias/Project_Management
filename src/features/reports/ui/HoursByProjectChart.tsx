import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { HoursByProject } from '../services/reportService';

interface HoursByProjectChartProps {
  data: HoursByProject[];
}

// Custom Tooltip for Hours by Project
const CustomProjectTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const hours = data.value as number;
    const projectName = data.payload?.projectName || '';
    
    return (
      <div 
        className="bg-white border border-[#E5E7EB] rounded-[14px] shadow-lg p-4 min-w-[200px]"
        style={{ 
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '14px',
          padding: '12px 16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900 border-b border-[#E7E7E7] pb-2">
            {projectName}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-gray-600">Hours:</span>
            <span className="text-lg font-bold text-[#E90E1D]">
              {hours.toFixed(1)}h
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const HoursByProjectChart: React.FC<HoursByProjectChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="rounded-[14px]">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold text-foreground">Hours by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] sm:h-[240px]">
            <p className="text-xs sm:text-sm text-muted-foreground">No data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px]">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base font-semibold text-foreground">Hours by Project</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="h-[200px] sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E7" />
            <XAxis 
              dataKey="projectName" 
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
              className="sm:h-[80px]"
            />
            <YAxis 
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 10 } }}
            />
            <Tooltip 
              content={<CustomProjectTooltip />}
            />
            <Bar 
              dataKey="hours" 
              fill="#E90E1D" 
              fillOpacity={0.3}
              stroke="#E90E1D"
              strokeWidth={2}
              radius={[14, 14, 0, 0]}
            />
          </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

