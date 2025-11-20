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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Estimate vs Logged</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Estimate vs Logged</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 text-xs font-semibold text-gray-700">Task</th>
                <th className="text-left p-2 text-xs font-semibold text-gray-700">Project</th>
                <th className="text-left p-2 text-xs font-semibold text-gray-700">Estimate</th>
                <th className="text-left p-2 text-xs font-semibold text-gray-700">Logged</th>
                <th className="text-left p-2 text-xs font-semibold text-gray-700">Variance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-xs text-gray-900">{row.taskName}</td>
                  <td className="p-2 text-xs text-gray-600">{row.projectName}</td>
                  <td className="p-2 text-xs text-gray-900">{row.estimate.toFixed(1)}h</td>
                  <td className="p-2 text-xs text-gray-900">{row.logged.toFixed(1)}h</td>
                  <td className={cn(
                    'p-2 text-xs font-medium',
                    row.variance > 0 && 'text-red-600',
                    row.variance < 0 && 'text-green-600',
                    row.variance === 0 && 'text-gray-600'
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

