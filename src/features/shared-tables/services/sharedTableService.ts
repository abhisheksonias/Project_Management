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

export interface PMTableUser {
  id: string;
  table_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export interface TableUserWithDetails extends PMTableUser {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AssignUserData {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}

// ============================
// SERVICE CLASS
// ============================

class SharedTableService {
  /**
   * Get all tables (for authenticated users)
   * - Admin users have access to all tables
   * - If table has no assigned users, it's visible to all users
   * - Otherwise, filters tables where user is owner, editor, or viewer via pm_table_users
   * - Also includes tables created by the user
   */
  async getAllTables(userId?: string, userRole?: string): Promise<PMTable[]> {
    // Admin has access to all tables
    if (userRole === 'Admin') {
      const { data, error } = await supabase
        .from('pm_tables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PMTable[];
    }

    if (!userId) {
      // If no userId, return all tables (for public access)
      const { data, error } = await supabase
        .from('pm_tables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PMTable[];
    }

    // Get all tables
    const { data: allTables, error: allError } = await supabase
      .from('pm_tables')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) throw allError;

    // Get all table-user assignments to check which tables have assigned users
    const { data: allTableUsers, error: tableUsersError } = await supabase
      .from('pm_table_users')
      .select('table_id, role');

    if (tableUsersError) throw tableUsersError;

    // Get table IDs where user has access via pm_table_users
    const { data: userTableAccess, error: accessError } = await supabase
      .from('pm_table_users')
      .select('table_id')
      .eq('user_id', userId);

    if (accessError) throw accessError;

    const accessibleTableIds = (userTableAccess || []).map((a) => a.table_id);
    
    // Group table users by table_id to check if table has only owner or has other assigned users
    const tableUsersByTable = new Map<string, Array<{ role: string }>>();
    (allTableUsers || []).forEach((tu: any) => {
      if (!tableUsersByTable.has(tu.table_id)) {
        tableUsersByTable.set(tu.table_id, []);
      }
      tableUsersByTable.get(tu.table_id)!.push({ role: tu.role });
    });

    // Filter tables:
    // 1. User created it (created_by = userId)
    // 2. User has access via pm_table_users
    // 3. Table has no assigned users OR only has owner (visible to all)
    const filtered = (allTables || []).filter((table: any) => {
      // User created it
      if (table.created_by === userId) return true;
      
      const tableUsers = tableUsersByTable.get(table.id) || [];
      // Table has no assigned users - visible to all
      if (tableUsers.length === 0) return true;
      
      // Table has only owner assigned - visible to all (not specifically assigned)
      if (tableUsers.length === 1 && tableUsers[0].role === 'owner') return true;
      
      // User has access via pm_table_users
      if (accessibleTableIds.includes(table.id)) return true;
      
      return false;
    });

    return filtered as PMTable[];
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
   * Automatically assigns creator as 'owner' in pm_table_users
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

    // Automatically assign creator as owner
    const { error: userError } = await supabase
      .from('pm_table_users')
      .insert({
        table_id: table.id,
        user_id: userId,
        role: 'owner',
      });

    if (userError) {
      console.error('Error assigning owner to table:', userError);
      // Don't throw - table is created, user assignment can be fixed later
    }

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

  /**
   * Get all users assigned to a table with user details
   */
  async getTableUsers(tableId: string): Promise<TableUserWithDetails[]> {
    const { data, error } = await supabase
      .from('pm_table_users')
      .select(`
        *,
        user:users!pm_table_users_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('table_id', tableId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      table_id: item.table_id,
      user_id: item.user_id,
      role: item.role,
      created_at: item.created_at,
      user: item.user ? {
        id: item.user.id,
        name: item.user.name,
        email: item.user.email,
      } : undefined,
    })) as TableUserWithDetails[];
  }

  /**
   * Assign users to a table (upsert - updates if exists, creates if not)
   */
  async assignUsers(tableId: string, users: AssignUserData[]): Promise<void> {
    if (users.length === 0) {
      // If no users, remove all assignments (except owner)
      const { error } = await supabase
        .from('pm_table_users')
        .delete()
        .eq('table_id', tableId)
        .neq('role', 'owner');

      if (error) throw error;
      return;
    }

    // Upsert all user assignments
    const assignments = users.map((user) => ({
      table_id: tableId,
      user_id: user.user_id,
      role: user.role,
    }));

    const { error } = await supabase
      .from('pm_table_users')
      .upsert(assignments, {
        onConflict: 'table_id,user_id',
      });

    if (error) throw error;

    // Remove users that are not in the new list (except owner)
    // First get all current users for this table
    const { data: currentUsers, error: fetchError } = await supabase
      .from('pm_table_users')
      .select('user_id, role')
      .eq('table_id', tableId);

    if (fetchError) throw fetchError;

    const userIds = users.map((u) => u.user_id);
    const usersToRemove = (currentUsers || [])
      .filter((cu) => !userIds.includes(cu.user_id) && cu.role !== 'owner')
      .map((cu) => cu.user_id);

    if (usersToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('pm_table_users')
        .delete()
        .eq('table_id', tableId)
        .in('user_id', usersToRemove);

      if (deleteError) throw deleteError;
    }
  }

  /**
   * Remove a user from a table (cannot remove owner)
   */
  async removeTableUser(tableId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('pm_table_users')
      .delete()
      .eq('table_id', tableId)
      .eq('user_id', userId)
      .neq('role', 'owner');

    if (error) throw error;
  }

  /**
   * Update user role for a table
   */
  async updateTableUserRole(tableId: string, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<void> {
    const { error } = await supabase
      .from('pm_table_users')
      .update({ role })
      .eq('table_id', tableId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

export const sharedTableService = new SharedTableService();

