import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectMonthlyProfit, useProjectProfitById, useProjectUserCosts } from '../hooks/useProfit';
import { ProjectMonthlyProfitChart } from './ProjectMonthlyProfitChart';
import { ProjectOverallProfitCard } from './ProjectOverallProfitCard';
import { ProjectUserCostsChart } from './ProjectUserCostsChart';
import { TrendingUp, TrendingDown, DollarSign, DollarSign as CostIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectFinancialDrawerProps {
  projectId: string | null;
  projectName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectFinancialDrawer: React.FC<ProjectFinancialDrawerProps> = ({
  projectId,
  projectName,
  open,
  onOpenChange,
}) => {
  const { data: monthlyProfit, isLoading: isLoadingMonthly } = useProjectMonthlyProfit(
    projectId || undefined
  );
  const { data: overallProfit, isLoading: isLoadingOverall } = useProjectProfitById(
    projectId || undefined
  );
  const { data: userCosts, isLoading: isLoadingUserCosts } = useProjectUserCosts(
    projectId || undefined
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-primary" />
            <div className="flex-1">
              <DrawerTitle className="text-2xl font-bold text-foreground">
                {projectName || 'Project Financial Details'}
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                Monthly revenue, costs, and profit breakdown
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* Overall Profit Card */}
          {isLoadingOverall ? (
            <Card className="rounded-[14px] border-2 shadow-lg">
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : overallProfit ? (
            <ProjectOverallProfitCard profit={overallProfit} />
          ) : null}

          {/* Monthly Profit Chart */}
          {isLoadingMonthly ? (
            <Card className="rounded-[14px] border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Monthly Profit Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ) : monthlyProfit && monthlyProfit.length > 0 ? (
            <ProjectMonthlyProfitChart data={monthlyProfit} />
          ) : (
            <Card className="rounded-[14px] border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Monthly Profit Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-sm text-muted-foreground">No monthly data available</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost per User Chart */}
          <ProjectUserCostsChart data={userCosts} isLoading={isLoadingUserCosts} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

