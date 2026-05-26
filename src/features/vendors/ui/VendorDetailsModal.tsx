import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendorProjects } from '../hooks/useVendors';
import { VendorProject } from '../services/vendorService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendorDetailsModalProps {
  vendorId: string | null;
  vendorName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const VendorDetailsModal: React.FC<VendorDetailsModalProps> = ({
  vendorId,
  vendorName,
  open,
  onOpenChange,
}) => {
  const { data: projects, isLoading } = useVendorProjects(vendorId || undefined);

  // Calculate totals
  const totals = React.useMemo(() => {
    if (!projects) return null;
    return projects.reduce(
      (acc, project) => ({
        revenue: acc.revenue + project.project_revenue,
        cost: acc.cost + project.project_total_cost,
        profit: acc.profit + project.profit,
      }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [projects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-primary" />
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-foreground">
                {vendorName || 'Vendor Projects'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Project details and financial breakdown for this vendor
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Summary Cards */}
          {totals && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totals.revenue)}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Total Cost
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totals.cost)}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Net Profit
                    </p>
                    {totals.profit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-700" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-700" />
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      totals.profit >= 0 ? 'text-green-700' : 'text-red-700'
                    )}
                  >
                    {formatCurrency(totals.profit)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Projects Table */}
          <Card className="rounded-[14px] border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Projects ({projects?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !projects || projects.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted-foreground">No projects found for this vendor</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/50">
                      <TableHead className="font-semibold">Project Name</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Revenue</TableHead>
                      <TableHead className="text-right font-semibold">Cost</TableHead>
                      <TableHead className="text-right font-semibold">Profit</TableHead>
                      <TableHead className="text-right font-semibold">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => {
                      const isPositive = project.profit >= 0;
                      return (
                        <TableRow key={project.project_id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{project.project_name}</TableCell>
                          <TableCell>
                            {project.status ? (
                              <Badge variant="outline" className="rounded-[8px]">
                                {project.status}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(project.project_revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(project.project_total_cost)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-semibold',
                              isPositive ? 'text-green-700' : 'text-red-700'
                            )}
                          >
                            {formatCurrency(project.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {project.profit_margin_percent !== null ? (
                              <span
                                className={cn(
                                  'font-medium',
                                  project.profit_margin_percent >= 0
                                    ? 'text-green-700'
                                    : 'text-red-700'
                                )}
                              >
                                {project.profit_margin_percent >= 0 ? '+' : ''}
                                {project.profit_margin_percent.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

