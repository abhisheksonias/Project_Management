import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  expenseService,
  ExpenseFilters,
  ExpenseInput,
} from '../services/expenseService';
import { toast } from 'sonner';

export const useExpenses = (filters?: ExpenseFilters) => {
  return useQuery({
    queryKey: ['admin', 'expenses', filters],
    queryFn: () => expenseService.list(filters),
    staleTime: 30000,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => expenseService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      toast.success('Expense added');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add expense'),
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) =>
      expenseService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      toast.success('Expense updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update expense'),
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      toast.success('Expense deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete expense'),
  });
};
