import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EstimateVsLogged } from '../services/reportService';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface EstimateVsLoggedTableProps {
  data: EstimateVsLogged[];
}

export const EstimateVsLoggedTable: React.FC<EstimateVsLoggedTableProps> = ({ data }) => {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <Card className="rounded-[14px]">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Estimate vs Logged</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Mobile Card Layout
  if (isMobile) {
    return (
      <Card className="rounded-[14px]">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold text-foreground">Estimate vs Logged</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.map((row, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{row.taskName}</p>
                  <p className="text-xs text-muted-foreground truncate">{row.projectName}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">Estimate</p>
                  <p className="font-medium">{row.estimate.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Logged</p>
                  <p className="font-medium">{row.logged.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Variance</p>
                  <p className={cn(
                    'font-medium',
                    row.variance > 0 && 'text-primary',
                    row.variance < 0 && 'text-green-600',
                    row.variance === 0 && 'text-muted-foreground'
                  )}>
                    {row.variance > 0 ? '+' : ''}{row.variance.toFixed(1)}h
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Desktop Table Layout
  return (
    <Card className="rounded-[14px]">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base font-semibold text-foreground">Estimate vs Logged</CardTitle>
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

