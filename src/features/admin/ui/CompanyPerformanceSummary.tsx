import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyProfitMonthly } from '@/features/profit/hooks/useProfit';
import { DollarSign, TrendingUp, TrendingDown, Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminStats } from '../hooks/useAdminStats';
import { AdminFilters, adminService } from '../services/adminService';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface CompanyPerformanceSummaryProps {
  filters?: AdminFilters;
}

export const CompanyPerformanceSummary: React.FC<CompanyPerformanceSummaryProps> = ({ filters }) => {
  const { data: stats, isLoading: isLoadingStats } = useAdminStats(filters);
  const { data: monthlyData, isLoading: isLoadingMonthly } = useCompanyProfitMonthly();

  // Get date range from filters
  const dateRange = useMemo(() => {
    if (!filters) return null;
    return adminService.getDateRange(filters);
  }, [filters]);

  // Calculate profit for selected period (filtered by date range)
  const periodProfit = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return null;

    // If no filters, show most recent month
    if (!dateRange) {
      const mostRecent = monthlyData[0];
      if (!mostRecent) return null;
      return {
        revenue: mostRecent.company_revenue,
        cost: mostRecent.company_cost,
        profit: mostRecent.profit,
      };
    }

    const { start, end } = dateRange;
    const startMonth = startOfMonth(start);
    const endMonth = endOfMonth(end);

    // Filter monthly data within the date range
    // A month is included if its month_start falls within the date range
    const filteredMonths = monthlyData.filter((month) => {
      const monthDate = new Date(month.month_start);
      const monthStart = startOfMonth(monthDate);
      
      // Check if month's start date is within or overlaps the filter range
      return monthStart >= startMonth && monthStart <= endMonth;
    });

    if (filteredMonths.length === 0) return null;

    // Sum up revenue, cost, and profit for the period
    return filteredMonths.reduce(
      (acc, month) => ({
        revenue: acc.revenue + month.company_revenue,
        cost: acc.cost + month.company_cost,
        profit: acc.profit + month.profit,
      }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [monthlyData, dateRange]);

  const isLoading = isLoadingStats || isLoadingMonthly;

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {/* Active Projects */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Active Projects
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.activeProjects ?? 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Profit (filtered) */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : periodProfit ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={cn(
                  'h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0',
                  periodProfit.profit >= 0 ? 'bg-green-100' : 'bg-red-100'
                )}
              >
                {periodProfit.profit >= 0 ? (
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                ) : (
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Period Profit
                </p>
                <p
                  className={cn(
                    'text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1 truncate',
                    periodProfit.profit >= 0 ? 'text-green-700' : 'text-red-700'
                  )}
                >
                  {formatCurrency(periodProfit.profit)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Period Profit
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">—</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Revenue (filtered) */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : periodProfit ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Period Revenue
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate">
                  {formatCurrency(periodProfit.revenue)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Period Revenue
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">—</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-3 sm:p-4">
          {isLoading ? (
            <Skeleton className="h-14 sm:h-16 w-full" />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Active Tasks
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.inProgressTasks ?? 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

