import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectProfit } from '../services/profitService';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface ProjectsProfitTableProps {
  projects: ProjectProfit[];
  isLoading?: boolean;
  onProjectClick: (project: ProjectProfit) => void;
}

export const ProjectsProfitTable: React.FC<ProjectsProfitTableProps> = ({
  projects,
  isLoading,
  onProjectClick,
}) => {
  const navigate = useNavigate();

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

  const getProfitBadgeVariant = (profit: number): 'default' | 'destructive' | 'secondary' => {
    if (profit < 0) return 'destructive';
    if (profit === 0) return 'secondary';
    return 'default';
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Profit Margin</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
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
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <p className="text-muted-foreground">No projects found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">Profit Margin</TableHead>
            <TableHead className="text-right">Total Hours</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow
              key={project.project_id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onProjectClick(project)}
            >
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell className="text-right">{formatCurrency(project.project_revenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(project.project_total_cost)}</TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    project.profit < 0
                      ? 'text-red-600 font-semibold'
                      : project.profit > 0
                      ? 'text-green-600 font-semibold'
                      : ''
                  }
                >
                  {formatCurrency(project.profit)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    project.profit_margin_percent !== null && project.profit_margin_percent < 0
                      ? 'text-red-600 font-semibold'
                      : project.profit_margin_percent !== null && project.profit_margin_percent > 0
                      ? 'text-green-600 font-semibold'
                      : ''
                  }
                >
                  {project.profit_margin_percent !== null
                    ? `${formatNumber(project.profit_margin_percent)}%`
                    : '-'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(project.total_hours)}
              </TableCell>
              <TableCell className="text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectClick(project);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  View Details
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

