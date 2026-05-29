import { supabase } from '@/integrations/supabase/client';

export const EXPENSE_CATEGORIES = [
  'Software',
  'Travel',
  'Marketing',
  'Office',
  'Hosting',
  'Contractor',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  expense_date: string;
  category: string;
  project_id: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  projects?: { name: string } | null;
  created_by_user?: { name: string } | null;
}

export interface ExpenseInput {
  title: string;
  amount: number;
  currency?: string;
  expense_date: string;
  category: string;
  project_id?: string | null;
  notes?: string | null;
  receipt_url?: string | null;
  created_by?: string | null;
}

export interface ExpenseFilters {
  projectId?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

class ExpenseService {
  async list(filters?: ExpenseFilters): Promise<Expense[]> {
    let q = (supabase as any)
      .from('expenses')
      .select('*, projects(name)')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.projectId && filters.projectId !== 'all') {
      q = q.eq('project_id', filters.projectId);
    }
    if (filters?.category && filters.category !== 'all') {
      q = q.eq('category', filters.category);
    }
    if (filters?.dateFrom) {
      q = q.gte('expense_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      q = q.lte('expense_date', filters.dateTo);
    }

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data || []) as Expense[];

    if (filters?.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          e.projects?.name?.toLowerCase().includes(term) ||
          e.notes?.toLowerCase().includes(term)
      );
    }

    return rows.map((row) => ({
      ...row,
      amount: parseFloat(String(row.amount ?? 0)),
    }));
  }

  async create(input: ExpenseInput): Promise<Expense> {
    const { data, error } = await (supabase as any)
      .from('expenses')
      .insert({
        title: input.title.trim(),
        amount: input.amount,
        currency: input.currency ?? 'INR',
        expense_date: input.expense_date,
        category: input.category,
        project_id: input.project_id || null,
        notes: input.notes?.trim() || null,
        receipt_url: input.receipt_url || null,
        created_by: input.created_by ?? null,
      })
      .select('*, projects(name)')
      .single();

    if (error) throw error;
    return { ...data, amount: parseFloat(String(data.amount ?? 0)) };
  }

  async update(id: string, input: ExpenseInput): Promise<Expense> {
    const { data, error } = await (supabase as any)
      .from('expenses')
      .update({
        title: input.title.trim(),
        amount: input.amount,
        currency: input.currency ?? 'INR',
        expense_date: input.expense_date,
        category: input.category,
        project_id: input.project_id || null,
        notes: input.notes?.trim() || null,
        receipt_url: input.receipt_url || null,
      })
      .eq('id', id)
      .select('*, projects(name)')
      .single();

    if (error) throw error;
    return { ...data, amount: parseFloat(String(data.amount ?? 0)) };
  }

  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any).from('expenses').delete().eq('id', id);
    if (error) throw error;
  }
}

export const expenseService = new ExpenseService();
