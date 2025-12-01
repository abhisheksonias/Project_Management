import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, X } from 'lucide-react';
import { ProjectProfit, UserProjectProfit } from '../services/profitService';
import { exportUserProjectProfitToCSV } from '@/shared/utils/csvExportProfit';
import { useToast } from '@/hooks/use-toast';

interface ProjectDetailsDrawerProps {
  project: ProjectProfit | null;
  users: UserProjectProfit[];
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  project,
  users,
  isLoading,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  const handleExportCSV = () => {
    try {
      if (!project) return;
      exportUserProjectProfitToCSV(users, project.name);
      toast({
        title: 'Export successful',
        description: `Exported ${users.length} user(s) to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export CSV',
        variant: 'destructive',
      });
    }
  };

  if (!project) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DrawerTitle className="text-2xl">Project {project.name} Details</DrawerTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-xl font-semibold mt-1">
                {formatCurrency(project.project_revenue)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-xl font-semibold mt-1">
                {formatCurrency(project.project_total_cost)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Profit</p>
              <p className="text-xl font-semibold mt-1">
                <span
                  className={
                    project.profit < 0
                      ? 'text-red-600'
                      : project.profit > 0
                      ? 'text-green-600'
                      : ''
                  }
                >
                  {formatCurrency(project.profit)}
                </span>
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Margin %</p>
              <p className="text-xl font-semibold mt-1">
                <span
                  className={
                    project.profit_margin_percent !== null && project.profit_margin_percent < 0
                      ? 'text-red-600'
                      : project.profit_margin_percent !== null && project.profit_margin_percent > 0
                      ? 'text-green-600'
                      : ''
                  }
                >
                  {project.profit_margin_percent !== null
                    ? `${formatNumber(project.profit_margin_percent)}%`
                    : '-'}
                </span>
              </p>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Financial Overview Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Financial Overview</h3>
            <div className="rounded-lg border bg-muted/30 h-64 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Revenue</p>
                <p className="text-sm text-muted-foreground mb-2">Cost</p>
                <p className="text-sm text-muted-foreground">Profit</p>
              </div>
            </div>
          </div>

          {/* User Performance Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">User Performance</h3>

          {/* Users Table */}
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Revenue Share</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-md border p-12 text-center">
              <p className="text-muted-foreground">No user data available</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Revenue Share</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.user_name}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(user.user_hours)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(user.user_revenue_share)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(user.user_cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={user.user_profit < 0 ? 'destructive' : 'default'}
                        >
                          {formatCurrency(user.user_profit)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className="border-t p-4 flex justify-end gap-3">
          <Button onClick={handleExportCSV} variant="outline" disabled={users.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export User Breakdown
          </Button>
          <Button onClick={onClose} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Close
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

