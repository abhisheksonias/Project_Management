import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, Receipt, Search } from 'lucide-react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useAdminProjectsForFilter } from '@/features/admin/hooks/useAdminProjects';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenseFieldOptions,
  useExpenses,
  useUpdateExpense,
} from '@/features/expenses/hooks/useExpenses';
import { Expense } from '@/features/expenses/services/expenseService';
import { ExpenseFormDialog, ExpenseFormValues } from '@/features/expenses/ui/ExpenseFormDialog';
import {
  ExpenseDateFilters,
  buildMonthOptions,
  ExpensePeriodMode,
  monthToDateRange,
} from '@/features/expenses/ui/ExpenseDateFilters';
import {
  ExpensePeriodSummary,
  formatExpenseMoney,
} from '@/features/expenses/ui/ExpensePeriodSummary';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const normalizeCurrency = (currency: string) => {
  const c = (currency || 'INR').toUpperCase();
  if (c === 'USD' || c === 'INR') return c;
  return 'INR';
};

const sumByCurrency = (items: Expense[]) => {
  const map = new Map<string, number>();
  for (const e of items) {
    const code = normalizeCurrency(e.currency);
    map.set(code, (map.get(code) || 0) + e.amount);
  }
  return map;
};

const AdminExpenses: React.FC = () => {
  const { profile } = useAuth();
  const { data: projects = [] } = useAdminProjectsForFilter();
  const monthOptions = useMemo(() => buildMonthOptions(24), []);

  const [periodMode, setPeriodMode] = useState<ExpensePeriodMode>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dateFrom, setDateFrom] = useState(() => monthToDateRange(format(new Date(), 'yyyy-MM')).dateFrom);
  const [dateTo, setDateTo] = useState(() => monthToDateRange(format(new Date(), 'yyyy-MM')).dateTo);
  const [periodLabel, setPeriodLabel] = useState(() => monthToDateRange(format(new Date(), 'yyyy-MM')).label);

  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customPickerOpen, setCustomPickerOpen] = useState(false);

  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      projectId: projectFilter,
      category: categoryFilter,
      search,
      dateFrom,
      dateTo,
    }),
    [projectFilter, categoryFilter, search, dateFrom, dateTo]
  );

  const { data: expenses = [], isLoading } = useExpenses(filters);
  const { data: fieldOptions = { titles: [], categories: [] } } = useExpenseFieldOptions();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const totalsByCurrency = useMemo(() => sumByCurrency(expenses), [expenses]);

  const handleMonthChange = (yyyyMm: string) => {
    setSelectedMonth(yyyyMm);
    const range = monthToDateRange(yyyyMm);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setPeriodLabel(range.label);
  };

  const handleApplyCustomRange = () => {
    if (!customFrom || !customTo) return;
    setDateFrom(format(customFrom, 'yyyy-MM-dd'));
    setDateTo(format(customTo, 'yyyy-MM-dd'));
    setPeriodLabel(`${format(customFrom, 'MMM d, yyyy')} – ${format(customTo, 'MMM d, yyyy')}`);
    setCustomPickerOpen(false);
  };

  const toInput = (values: ExpenseFormValues) => ({
    title: values.title.trim(),
    amount: parseFloat(values.amount),
    currency: values.currency,
    expense_date: values.expense_date,
    category: values.category.trim(),
    project_id: values.project_id === 'none' ? null : values.project_id,
    notes: values.notes || null,
    created_by: profile?.id ?? null,
  });

  const handleFormSubmit = async (values: ExpenseFormValues) => {
    const input = toInput(values);
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input });
    } else {
      await createMutation.mutateAsync(input);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <AdminLayout>
      <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
        <header className="shrink-0 border-b border-border/50 bg-card/95 px-4 py-5 sm:px-6 lg:px-8 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h1 className="text-2xl font-bold sm:text-3xl">Expense Management</h1>
              </div>
              <p className="text-sm text-muted-foreground ml-4">
                Track spending by month or custom date range.
              </p>
            </div>
            <Button
              className="shrink-0 rounded-[14px]"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add expense
            </Button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4">
          <Card className="rounded-[14px] border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <ExpenseDateFilters
                mode={periodMode}
                onModeChange={setPeriodMode}
                monthValue={selectedMonth}
                onMonthChange={handleMonthChange}
                monthOptions={monthOptions}
                customFrom={customFrom}
                customTo={customTo}
                onCustomRangeChange={(range) => {
                  setCustomFrom(range.from);
                  setCustomTo(range.to);
                }}
                onApplyCustomRange={handleApplyCustomRange}
                customPickerOpen={customPickerOpen}
                onCustomPickerOpenChange={setCustomPickerOpen}
              />
            </CardContent>
          </Card>

          {isLoading ? (
            <Skeleton className="h-36 w-full rounded-[14px]" />
          ) : (
            <ExpensePeriodSummary
              periodLabel={periodLabel}
              entryCount={expenses.length}
              totalsByCurrency={totalsByCurrency}
            />
          )}

          <Card className="rounded-[14px] border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search title or notes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 rounded-[14px] bg-background"
                  />
                </div>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-9 w-full lg:w-44 rounded-[14px] bg-background">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[14px]">
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-full lg:w-40 rounded-[14px] bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[14px]">
                    <SelectItem value="all">All categories</SelectItem>
                    {fieldOptions.categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-[14px] border border-border/60 bg-card shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : expenses.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No expenses in this period. Try another month or add an expense.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[88px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id} className="hover:bg-muted/20">
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(parseISO(e.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px]">
                          <span className="line-clamp-1">{e.title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {e.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-muted-foreground">
                          {e.projects?.name || '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                          {formatExpenseMoney(e.amount, e.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditing(e);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(e.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center pb-2">
            Created and last updated dates are shown when you edit an expense.
          </p>
        </div>
      </div>

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        expense={editing}
        projects={projects}
        titleOptions={fieldOptions.titles}
        categoryOptions={fieldOptions.categories}
        onSubmit={handleFormSubmit}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Delete expense
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-[14px]" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-[14px]"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminExpenses;
