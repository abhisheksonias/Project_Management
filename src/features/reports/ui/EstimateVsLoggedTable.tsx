import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EstimateVsLogged } from '../services/reportService';
import { cn } from '@/lib/utils';

interface EstimateVsLoggedTableProps {
  data: EstimateVsLogged[];
}

export const EstimateVsLoggedTable: React.FC<EstimateVsLoggedTableProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Card className="rounded-[14px]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Estimate vs Logged</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[14px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">Estimate vs Logged</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-2 sm:p-3 text-xs font-semibold text-foreground">Task</th>
                <th className="text-left p-2 sm:p-3 text-xs font-semibold text-foreground">Project</th>
                <th className="text-left p-2 sm:p-3 text-xs font-semibold text-foreground">Estimate</th>
                <th className="text-left p-2 sm:p-3 text-xs font-semibold text-foreground">Logged</th>
                <th className="text-left p-2 sm:p-3 text-xs font-semibold text-foreground">Variance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-foreground">{row.taskName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground">{row.projectName}</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-foreground">{row.estimate.toFixed(1)}h</td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-foreground">{row.logged.toFixed(1)}h</td>
                  <td className={cn(
                    'p-2 sm:p-3 text-xs sm:text-sm font-medium',
                    row.variance > 0 && 'text-primary',
                    row.variance < 0 && 'text-green-600',
                    row.variance === 0 && 'text-muted-foreground'
                  )}>
                    {row.variance > 0 ? '+' : ''}{row.variance.toFixed(1)}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

