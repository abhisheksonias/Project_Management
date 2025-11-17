import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Insights } from '../services/reportService';

interface InsightsCardProps {
  insights: Insights;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ insights }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs text-gray-600">Top Focus Project</p>
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">
            {insights.topFocusProject}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-gray-600">Biggest Over-Estimate</p>
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">
            {insights.biggestOverEstimate}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-gray-600">Biggest Under-Estimate</p>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
            {insights.biggestUnderEstimate}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-gray-600">Active Days</p>
          <p className="text-base font-semibold text-red-600">{insights.activeDays}</p>
        </div>
      </CardContent>
    </Card>
  );
};

