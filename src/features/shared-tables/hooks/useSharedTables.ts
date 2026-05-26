import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  sharedTableService,
  PMTable,
  TableWithData,
  CreateTableData,
  UpdateTableData,
  CreateColumnData,
  UpdateColumnData,
  CreateRowData,
  UpdateCellData,
} from '../services/sharedTableService';
import { useAuth } from '@/contexts/AuthContext';

// ============================
// QUERY HOOKS
// ============================

export const useSharedTables = () => {
  const { profile } = useAuth();
  
  return useQuery<PMTable[]>({
    queryKey: ['shared-tables', profile?.id, profile?.role],
    queryFn: () => sharedTableService.getAllTables(profile?.id, profile?.role),
    staleTime: 30000,
    enabled: !!profile?.id,
  });
};

export const useSharedTable = (tableId: string | null) => {
  return useQuery<TableWithData | null>({
    queryKey: ['shared-table', tableId],
    queryFn: () => (tableId ? sharedTableService.getTableById(tableId) : Promise.resolve(null)),
    enabled: !!tableId,
    staleTime: 10000, // 10 seconds - tables can be edited frequently
  });
};

export const usePublicSharedTable = (token: string | null) => {
  return useQuery<TableWithData | null>({
    queryKey: ['public-shared-table', token],
    queryFn: () => (token ? sharedTableService.getPublicTableByToken(token) : Promise.resolve(null)),
    enabled: !!token,
    staleTime: 30000,
  });
};

// ============================
// MUTATION HOOKS
// ============================

export const useCreateTable = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: CreateTableData) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return sharedTableService.createTable(data, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-tables'] });
      toast.success('Table created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create table: ${error.message}`);
    },
  });
};

export const useUpdateTable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: UpdateTableData }) =>
      sharedTableService.updateTable(tableId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shared-tables'] });
      queryClient.invalidateQueries({ queryKey: ['shared-table', variables.tableId] });
      toast.success('Table updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update table: ${error.message}`);
    },
  });
};

export const useDeleteTable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tableId: string) => sharedTableService.deleteTable(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-tables'] });
      toast.success('Table deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete table: ${error.message}`);
    },
  });
};

export const useCreateColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateColumnData) => sharedTableService.createColumn(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shared-table', variables.table_id] });
      toast.success('Column added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add column: ${error.message}`);
    },
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId, data }: { columnId: string; data: UpdateColumnData }) =>
      sharedTableService.updateColumn(columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-table'] });
      toast.success('Column updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update column: ${error.message}`);
    },
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) => sharedTableService.deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-table'] });
      toast.success('Column deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete column: ${error.message}`);
    },
  });
};

export const useCreateRow = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: CreateRowData) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return sharedTableService.createRow(data, profile.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shared-table', variables.table_id] });
      toast.success('Row added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add row: ${error.message}`);
    },
  });
};

export const useDeleteRow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rowId: string) => sharedTableService.deleteRow(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-table'] });
      toast.success('Row deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete row: ${error.message}`);
    },
  });
};

export const useUpdateCell = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (data: UpdateCellData) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return sharedTableService.updateCell(data, profile.id);
    },
    onSuccess: () => {
      // Invalidate without showing toast for every cell update
      queryClient.invalidateQueries({ queryKey: ['shared-table'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update cell: ${error.message}`);
    },
  });
};

export const useReorderColumns = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, columnIds }: { tableId: string; columnIds: string[] }) =>
      sharedTableService.reorderColumns(columnIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shared-table', variables.tableId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder columns: ${error.message}`);
    },
  });
};

export const useReorderRows = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, rowIds }: { tableId: string; rowIds: string[] }) =>
      sharedTableService.reorderRows(rowIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shared-table', variables.tableId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder rows: ${error.message}`);
    },
  });
};

export const useDuplicateTable = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ tableId, newName }: { tableId: string; newName: string }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      return sharedTableService.duplicateTable(tableId, newName, profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-tables'] });
      toast.success('Table duplicated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate table: ${error.message}`);
    },
  });
};

