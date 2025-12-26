import { supabase } from '@/integrations/supabase/client';

// ============================
// INTERFACES
// ============================

export interface PMTable {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  is_public: boolean;
  public_token: string | null;
  allow_user_edit: boolean;
  created_at: string;
  updated_at: string;
}

export interface PMTableColumn {
  id: string;
  table_id: string;
  column_name: string;
  column_type: 'text' | 'number' | 'url' | 'dropdown' | 'date' | 'checkbox';
  config: Record<string, any> | null; // For dropdown options, etc.
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export interface PMTableRow {
  id: string;
  table_id: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export interface PMTableCell {
  id: string;
  row_id: string;
  column_id: string;
  value: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface TableWithData extends PMTable {
  columns: PMTableColumn[];
  rows: (PMTableRow & {
    cells: (PMTableCell & {
      column: PMTableColumn;
    })[];
  })[];
}

export interface CreateTableData {
  name: string;
  description?: string;
  is_public?: boolean;
  allow_user_edit?: boolean;
}

export interface UpdateTableData {
  name?: string;
  description?: string;
  is_public?: boolean;
  allow_user_edit?: boolean;
}

export interface CreateColumnData {
  table_id: string;
  column_name: string;
  column_type: 'text' | 'number' | 'url' | 'dropdown' | 'date' | 'checkbox';
  config?: Record<string, any>;
  sort_order?: number;
  is_required?: boolean;
}

export interface UpdateColumnData {
  column_name?: string;
  column_type?: 'text' | 'number' | 'url' | 'dropdown' | 'date' | 'checkbox';
  config?: Record<string, any>;
  sort_order?: number;
  is_required?: boolean;
}

export interface CreateRowData {
  table_id: string;
  sort_order?: number;
}

export interface UpdateCellData {
  row_id: string;
  column_id: string;
  value: string | null;
}

// ============================
// SERVICE CLASS
// ============================

class SharedTableService {
  /**
   * Get all tables (for authenticated users)
   */
  async getAllTables(userId?: string): Promise<PMTable[]> {
    const { data, error } = await supabase
      .from('pm_tables')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PMTable[];
  }

  /**
   * Get table by ID with all data (columns, rows, cells)
   */
  async getTableById(tableId: string): Promise<TableWithData | null> {
    // Get table
    const { data: table, error: tableError } = await supabase
      .from('pm_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError) throw tableError;
    if (!table) return null;

    // Get columns
    const { data: columns, error: columnsError } = await supabase
      .from('pm_table_columns')
      .select('*')
      .eq('table_id', tableId)
      .order('sort_order', { ascending: true });

    if (columnsError) throw columnsError;

    // Get rows
    const { data: rows, error: rowsError } = await supabase
      .from('pm_table_rows')
      .select('*')
      .eq('table_id', tableId)
      .order('sort_order', { ascending: true });

    if (rowsError) throw rowsError;

    // Get cells for all rows
    const rowIds = (rows || []).map((r) => r.id);
    let cells: PMTableCell[] = [];

    if (rowIds.length > 0) {
      const { data: cellsData, error: cellsError } = await supabase
        .from('pm_table_cells')
        .select('*')
        .in('row_id', rowIds);

      if (cellsError) throw cellsError;
      cells = (cellsData || []) as PMTableCell[];
    }

    // Combine data
    const columnsMap = new Map((columns || []).map((c) => [c.id, c]));
    const cellsByRow = new Map<string, PMTableCell[]>();
    cells.forEach((cell) => {
      if (!cellsByRow.has(cell.row_id)) {
        cellsByRow.set(cell.row_id, []);
      }
      cellsByRow.get(cell.row_id)!.push(cell);
    });

    return {
      ...(table as PMTable),
      columns: (columns || []) as PMTableColumn[],
      rows: (rows || []).map((row) => ({
        ...row,
        cells: (cellsByRow.get(row.id) || []).map((cell) => ({
          ...cell,
          column: columnsMap.get(cell.column_id)!,
        })),
      })),
    };
  }

  /**
   * Get public table by token (read-only)
   */
  async getPublicTableByToken(token: string): Promise<TableWithData | null> {
    const { data: table, error: tableError } = await supabase
      .from('pm_tables')
      .select('*')
      .eq('public_token', token)
      .eq('is_public', true)
      .single();

    if (tableError) throw tableError;
    if (!table) return null;

    // Use getTableById to get full data
    return this.getTableById(table.id);
  }

  /**
   * Create new table
   */
  async createTable(data: CreateTableData, userId: string): Promise<PMTable> {
    const { data: table, error } = await supabase
      .from('pm_tables')
      .insert({
        name: data.name,
        description: data.description || null,
        created_by: userId,
        is_public: data.is_public || false,
        allow_user_edit: data.allow_user_edit !== false, // Default true
      })
      .select()
      .single();

    if (error) throw error;
    return table as PMTable;
  }

  /**
   * Update table
   */
  async updateTable(tableId: string, data: UpdateTableData): Promise<void> {
    const { error } = await supabase
      .from('pm_tables')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    if (error) throw error;
  }

  /**
   * Delete table
   */
  async deleteTable(tableId: string): Promise<void> {
    const { error } = await supabase
      .from('pm_tables')
      .delete()
      .eq('id', tableId);

    if (error) throw error;
  }

  /**
   * Duplicate table with all columns, rows, and cells
   */
  async duplicateTable(tableId: string, newName: string, userId: string): Promise<PMTable> {
    // Get original table with all data
    const originalTable = await this.getTableById(tableId);
    if (!originalTable) {
      throw new Error('Table not found');
    }

    // Create new table
    const { data: newTable, error: tableError } = await supabase
      .from('pm_tables')
      .insert({
        name: newName,
        description: originalTable.description,
        created_by: userId,
        is_public: false, // Duplicated tables are private by default
        allow_user_edit: originalTable.allow_user_edit,
      })
      .select()
      .single();

    if (tableError) throw tableError;

    // Duplicate columns
    const columnMap = new Map<string, string>(); // old column id -> new column id
    for (const column of originalTable.columns) {
      const { data: newColumn, error: colError } = await supabase
        .from('pm_table_columns')
        .insert({
          table_id: newTable.id,
          column_name: column.column_name,
          column_type: column.column_type,
          config: column.config,
          sort_order: column.sort_order,
          is_required: column.is_required,
        })
        .select()
        .single();

      if (colError) throw colError;
      columnMap.set(column.id, newColumn.id);
    }

    // Duplicate rows and cells
    for (const row of originalTable.rows) {
      const { data: newRow, error: rowError } = await supabase
        .from('pm_table_rows')
        .insert({
          table_id: newTable.id,
          sort_order: row.sort_order,
          created_by: userId,
        })
        .select()
        .single();

      if (rowError) throw rowError;

      // Duplicate cells
      for (const cell of row.cells) {
        const newColumnId = columnMap.get(cell.column_id);
        if (newColumnId) {
          const { error: cellError } = await supabase
            .from('pm_table_cells')
            .insert({
              row_id: newRow.id,
              column_id: newColumnId,
              value: cell.value,
              updated_by: userId,
            });

          if (cellError) throw cellError;
        }
      }
    }

    return newTable as PMTable;
  }

  /**
   * Create column
   */
  async createColumn(data: CreateColumnData): Promise<PMTableColumn> {
    const { data: column, error } = await supabase
      .from('pm_table_columns')
      .insert({
        table_id: data.table_id,
        column_name: data.column_name,
        column_type: data.column_type,
        config: data.config || null,
        sort_order: data.sort_order ?? 0,
        is_required: data.is_required || false,
      })
      .select()
      .single();

    if (error) throw error;
    return column as PMTableColumn;
  }

  /**
   * Update column
   */
  async updateColumn(columnId: string, data: UpdateColumnData): Promise<void> {
    const { error } = await supabase
      .from('pm_table_columns')
      .update(data)
      .eq('id', columnId);

    if (error) throw error;
  }

  /**
   * Delete column
   */
  async deleteColumn(columnId: string): Promise<void> {
    const { error } = await supabase
      .from('pm_table_columns')
      .delete()
      .eq('id', columnId);

    if (error) throw error;
  }

  /**
   * Create row
   */
  async createRow(data: CreateRowData, userId: string): Promise<PMTableRow> {
    // Get max sort_order for this table
    const { data: existingRows } = await supabase
      .from('pm_table_rows')
      .select('sort_order')
      .eq('table_id', data.table_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const maxSortOrder = existingRows && existingRows.length > 0 
      ? existingRows[0].sort_order 
      : -1;

    const { data: row, error } = await supabase
      .from('pm_table_rows')
      .insert({
        table_id: data.table_id,
        sort_order: data.sort_order ?? maxSortOrder + 1,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Create empty cells for all columns
    const { data: columns } = await supabase
      .from('pm_table_columns')
      .select('id')
      .eq('table_id', data.table_id);

    if (columns && columns.length > 0) {
      const cellsToInsert = columns.map((col) => ({
        row_id: row.id,
        column_id: col.id,
        value: null,
        updated_by: userId,
      }));

      const { error: cellsError } = await supabase
        .from('pm_table_cells')
        .insert(cellsToInsert);

      if (cellsError) {
        console.error('Error creating cells:', cellsError);
        // Don't throw, row is already created
      }
    }

    return row as PMTableRow;
  }

  /**
   * Delete row
   */
  async deleteRow(rowId: string): Promise<void> {
    const { error } = await supabase
      .from('pm_table_rows')
      .delete()
      .eq('id', rowId);

    if (error) throw error;
  }

  /**
   * Update cell value
   */
  async updateCell(data: UpdateCellData, userId: string): Promise<void> {
    const { error } = await supabase
      .from('pm_table_cells')
      .upsert({
        row_id: data.row_id,
        column_id: data.column_id,
        value: data.value,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'row_id,column_id',
      });

    if (error) throw error;
  }

  /**
   * Reorder columns
   */
  async reorderColumns(columnIds: string[]): Promise<void> {
    const updates = columnIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('pm_table_columns')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);

      if (error) throw error;
    }
  }

  /**
   * Reorder rows
   */
  async reorderRows(rowIds: string[]): Promise<void> {
    const updates = rowIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('pm_table_rows')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);

      if (error) throw error;
    }
  }
}

export const sharedTableService = new SharedTableService();

