import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectProfitOverall } from '../services/profitService';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectOverallProfitCardProps {
  profit: ProjectProfitOverall;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const ProjectOverallProfitCard: React.FC<ProjectOverallProfitCardProps> = ({ profit }) => {
  const isPositive = profit.profit >= 0;
  const marginColor = profit.profit_margin_percent !== null && profit.profit_margin_percent >= 0
    ? 'text-green-700'
    : 'text-red-700';

  return (
    <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Overall Financial Summary</h3>
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isPositive ? "bg-green-100" : "bg-red-100"
            )}>
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-700" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-700" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Revenue */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Total Revenue
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(profit.project_revenue)}
              </p>
            </div>

            {/* Cost */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Total Cost
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(profit.project_total_cost)}
              </p>
            </div>

            {/* Profit */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-700" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-700" />
                )}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Net Profit
                </p>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                isPositive ? "text-green-700" : "text-red-700"
              )}>
                {formatCurrency(profit.profit)}
              </p>
              {profit.profit_margin_percent !== null && (
                <p className={cn("text-sm font-medium", marginColor)}>
                  {profit.profit_margin_percent >= 0 ? '+' : ''}
                  {profit.profit_margin_percent.toFixed(2)}% margin
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

