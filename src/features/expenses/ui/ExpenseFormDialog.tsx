import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Expense } from '../services/expenseService';
import { ExpenseDynamicField } from './ExpenseDynamicField';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface ExpenseFormValues {
  title: string;
  amount: string;
  currency: string;
  expense_date: string;
  category: string;
  project_id: string;
  notes: string;
}

const defaultValues: ExpenseFormValues = {
  title: '',
  amount: '',
  currency: 'INR',
  expense_date: format(new Date(), 'yyyy-MM-dd'),
  category: '',
  project_id: 'none',
  notes: '',
};

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  projects: { id: string; name: string }[];
  titleOptions: string[];
  categoryOptions: string[];
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  isSaving: boolean;
}

export const ExpenseFormDialog: React.FC<ExpenseFormDialogProps> = ({
  open,
  onOpenChange,
  expense,
  projects,
  titleOptions,
  categoryOptions,
  onSubmit,
  isSaving,
}) => {
  const [form, setForm] = useState<ExpenseFormValues>(defaultValues);
  const formSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      formSessionRef.current = null;
      return;
    }

    const sessionKey = expense?.id ?? '__new__';
    if (formSessionRef.current === sessionKey) return;
    formSessionRef.current = sessionKey;

    if (expense) {
      setForm({
        title: expense.title,
        amount: String(expense.amount),
        currency: expense.currency || 'INR',
        expense_date: expense.expense_date,
        category: expense.category,
        project_id: expense.project_id || 'none',
        notes: expense.notes || '',
      });
    } else {
      setForm({ ...defaultValues, expense_date: format(new Date(), 'yyyy-MM-dd') });
    }
  }, [open, expense?.id, expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.category.trim()) {
      toast.error('Category is required');
      return;
    }
    if (!form.amount || Number.isNaN(Number(form.amount))) {
      toast.error('Enter a valid amount');
      return;
    }
    await onSubmit({
      ...form,
      title: form.title.trim(),
      category: form.category.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ExpenseDynamicField
            id="exp-title"
            label="Title"
            value={form.title}
            options={titleOptions}
            onChange={(v) => setForm((p) => ({ ...p, title: v }))}
            placeholder="e.g. Figma subscription"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount</Label>
              <Input
                id="exp-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-date">Expense date</Label>
            <Input
              id="exp-date"
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
              required
            />
          </div>
          <ExpenseDynamicField
            id="exp-category"
            label="Category"
            value={form.category}
            options={categoryOptions}
            onChange={(v) => setForm((p) => ({ ...p, category: v }))}
            placeholder="e.g. Software"
            required
          />
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select
              value={form.project_id}
              onValueChange={(v) => setForm((p) => ({ ...p, project_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-notes">Notes</Label>
            <Textarea
              id="exp-notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
            />
          </div>
          {expense && (
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Created</span>
                <br />
                {format(new Date(expense.created_at), 'MMM dd, yyyy HH:mm')}
              </div>
              <div>
                <span className="font-medium text-foreground">Last updated</span>
                <br />
                {format(new Date(expense.updated_at), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : expense ? 'Update' : 'Add expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
