import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useProjectProfitOverall } from '@/features/profit/hooks/useProfit';
import { ProjectFinancialDrawer } from '@/features/profit/ui/ProjectFinancialDrawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminProfit: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projectsProfit, isLoading } = useProjectProfitOverall();

  const filteredProjects = useMemo(() => {
    if (!projectsProfit) return [];
    if (!searchQuery.trim()) return projectsProfit;

    const query = searchQuery.toLowerCase();
    return projectsProfit.filter(
      (project) =>
        project.project_name.toLowerCase().includes(query) ||
        project.project_id.toLowerCase().includes(query)
    );
  }, [projectsProfit, searchQuery]);

  const handleProjectClick = (projectId: string, projectName: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
  };

  const handleCloseDrawer = () => {
    setSelectedProjectId(null);
    setSelectedProjectName(null);
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (!projectsProfit) return null;
    return projectsProfit.reduce(
      (acc, project) => ({
        revenue: acc.revenue + project.project_revenue,
        cost: acc.cost + project.project_total_cost,
        profit: acc.profit + project.profit,
      }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [projectsProfit]);

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen bg-muted/30">
        {/* Header Section */}
        <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Project Profit & Finance
                </h1>
              </div>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base ml-4">
                View revenue, costs, and profit metrics for all projects.
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Summary Cards */}
            {totals && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatCurrency(totals.revenue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-red-700" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Total Cost
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatCurrency(totals.cost)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[14px] border-2 shadow-lg bg-gradient-to-br from-card to-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          totals.profit >= 0 ? 'bg-green-100' : 'bg-red-100'
                        )}
                      >
                        {totals.profit >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-700" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-700" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Net Profit
                        </p>
                        <p
                          className={cn(
                            'text-2xl font-bold',
                            totals.profit >= 0 ? 'text-green-700' : 'text-red-700'
                          )}
                        >
                          {formatCurrency(totals.profit)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-[14px] border-2"
                />
              </div>
            </div>

            {/* Projects Table */}
            <Card className="rounded-[14px] border-2 shadow-lg">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="p-12 text-center">
                    <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-semibold text-foreground mb-2">
                      {searchQuery ? 'No projects found' : 'No profit data available'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Projects with milestones and worklogs will appear here'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-muted/50">
                        <TableHead className="font-semibold">Project Name</TableHead>
                        <TableHead className="text-right font-semibold">Revenue</TableHead>
                        <TableHead className="text-right font-semibold">Cost</TableHead>
                        <TableHead className="text-right font-semibold">Profit</TableHead>
                        <TableHead className="text-right font-semibold">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((project) => {
                        const isPositive = project.profit >= 0;
                        return (
                          <TableRow
                            key={project.project_id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() =>
                              handleProjectClick(project.project_id, project.project_name)
                            }
                          >
                            <TableCell className="font-medium">{project.project_name}</TableCell>
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
        </div>

        {/* Project Financial Drawer */}
        <ProjectFinancialDrawer
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          open={!!selectedProjectId}
          onOpenChange={(open) => {
            if (!open) handleCloseDrawer();
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminProfit;

