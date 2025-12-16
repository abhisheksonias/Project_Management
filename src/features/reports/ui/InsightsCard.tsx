import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Insights } from '../services/reportService';

interface InsightsCardProps {
  insights: Insights;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ insights }) => {
  return (
    <Card className="rounded-[14px]">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base font-semibold text-foreground">Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Top Focus Project</p>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] sm:text-xs rounded-md px-2 py-0.5">
            <span className="truncate block max-w-full">{insights.topFocusProject}</span>
          </Badge>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Biggest Over-Estimate</p>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] sm:text-xs rounded-md px-2 py-0.5">
            <span className="truncate block max-w-full">{insights.biggestOverEstimate}</span>
          </Badge>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Biggest Under-Estimate</p>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-[10px] sm:text-xs rounded-md px-2 py-0.5">
            <span className="truncate block max-w-full">{insights.biggestUnderEstimate}</span>
          </Badge>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Active Days</p>
          <p className="text-sm sm:text-base font-semibold text-primary">{insights.activeDays}</p>
        </div>
      </CardContent>
    </Card>
  );
};

