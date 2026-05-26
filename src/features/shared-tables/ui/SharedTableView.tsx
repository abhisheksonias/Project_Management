import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, ExternalLink, Settings2, X, Download, GripVertical } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Services & Hooks
import { TableWithData, PMTableColumn } from '../services/sharedTableService';
import { useUpdateCell, useCreateRow, useDeleteRow, useDeleteColumn, useUpdateColumn, useReorderColumns, useReorderRows } from '../hooks/useSharedTables';

// Utils
import { formatDateLocal, parseDateLocal } from '../utils/dateUtils';
import { formatCellValueForExport } from '../utils/exportUtils';
import { getShortUrlText } from '../utils/urlUtils';
import { normalizeDropdownOptions, DROPDOWN_COLOR_OPTIONS, getTextColor } from '../utils/dropdownUtils';

interface SharedTableViewProps {
  table: TableWithData;
  isReadOnly?: boolean;
  onAddColumn?: () => void;
  onDeleteColumn?: (columnId: string) => void;
}

interface EditableCellProps {
  column: PMTableColumn;
  value: string | null;
  rowId: string;
  isReadOnly: boolean;
  onUpdate: (rowId: string, columnId: string, value: string | null) => void;
}


interface EditableColumnHeaderProps {
  column: PMTableColumn;
  isReadOnly: boolean;
  onUpdate: (columnId: string, columnName: string) => void;
  onDelete?: (columnId: string) => void;
  onUpdateConfig?: (columnId: string, config: Record<string, any>) => void;
  isDragging?: boolean;
}

const EditableColumnHeader: React.FC<EditableColumnHeaderProps> = ({
  column,
  isReadOnly,
  onUpdate,
  onDelete,
  onUpdateConfig,
  isDragging = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localName, setLocalName] = useState(column.column_name);

  useEffect(() => {
    setLocalName(column.column_name);
  }, [column.column_name]);

  const handleSave = useCallback(() => {
    if (localName.trim() && localName !== column.column_name) {
      onUpdate(column.id, localName.trim());
    }
    setIsEditing(false);
  }, [localName, column.column_name, column.id, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setLocalName(column.column_name);
        setIsEditing(false);
      }
    },
    [handleSave, column.column_name]
  );

  if (isReadOnly) {
    return <span>{column.column_name}</span>;
  }

  return (
    <div className={cn("flex items-center gap-1 flex-1 min-w-0", isDragging && "opacity-50")}>
      {isEditing ? (
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-5 text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
          autoFocus
        />
      ) : (
        <span
          className="cursor-text hover:bg-muted/50 px-1.5 py-0.5 rounded flex-1 min-w-0 truncate text-xs"
          onClick={() => setIsEditing(true)}
          title="Click to edit column name"
        >
          {column.column_name}
        </span>
      )}
      {column.column_type === 'dropdown' && onUpdateConfig && (
        <DropdownOptionsEditor
          column={column}
          onUpdateConfig={onUpdateConfig}
        />
      )}
      {onDelete && (
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(column.id);
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      )}
    </div>
  );
};

interface DropdownOptionsEditorProps {
  column: PMTableColumn;
  onUpdateConfig: (columnId: string, config: Record<string, any>) => void;
}

const DropdownOptionsEditor: React.FC<DropdownOptionsEditorProps> = ({
  column,
  onUpdateConfig,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rawOptions = column.config?.options || [];
  const [options, setOptions] = useState<Array<{ label: string; color: string }>>(() => {
    return normalizeDropdownOptions(rawOptions);
  });

  // Sync options when dialog opens or column config changes
  useEffect(() => {
    if (isOpen) {
      const rawOptions = column.config?.options || [];
      setOptions(normalizeDropdownOptions(rawOptions));
    }
  }, [isOpen, column.config]);

  const handleSave = useCallback(() => {
    onUpdateConfig(column.id, { ...column.config, options });
    setIsOpen(false);
  }, [column.id, column.config, options, onUpdateConfig]);

  const handleAddOption = useCallback(() => {
    setOptions([...options, { label: '', color: 'bg-secondary' }]);
  }, [options]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      setOptions(options.filter((_, i) => i !== index));
    },
    [options]
  );

  const handleOptionChange = useCallback(
    (index: number, field: 'label' | 'color', value: string) => {
      const newOptions = [...options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      setOptions(newOptions);
    },
    [options]
  );


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          title="Edit dropdown options"
        >
          <Settings2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Dropdown Options</DialogTitle>
          <DialogDescription>
            Manage options for the "{column.column_name}" dropdown column.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No options yet. Click "Add Option" to get started.
              </p>
            ) : (
              options.map((option, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-[14px]">
                  <Input
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    placeholder="Option label"
                    className="flex-1 h-8 text-sm"
                  />
                  <Select
                    value={option.color}
                    onValueChange={(value) => handleOptionChange(index, 'color', value)}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', option.color)} />
                          <span className="truncate">
                            {DROPDOWN_COLOR_OPTIONS.find((c) => c.value === option.color)?.label || 'Color'}
                          </span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DROPDOWN_COLOR_OPTIONS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-3 h-3 rounded-full', color.value)} />
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="w-full rounded-[14px]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-[14px]">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-[14px]">
            Save Options
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditableCell: React.FC<EditableCellProps> = ({
  column,
  value,
  rowId,
  isReadOnly,
  onUpdate,
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isEditing, setIsEditing] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Sync value when prop changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleSave = useCallback(() => {
    onUpdate(rowId, column.id, localValue || null);
    setIsEditing(false);
  }, [rowId, column.id, localValue, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setLocalValue(value || '');
        setIsEditing(false);
      }
    },
    [handleSave, value]
  );

  if (column.column_type === 'dropdown') {
    // Normalize options to object structure { label, color }
    const rawOptions = column.config?.options || [];
    const options = normalizeDropdownOptions(rawOptions);

    // Find selected option config for display color
    const selectedOption = options.find((o: any) => o.label === value);

    if (isReadOnly) {
      return (
        <div>
          {value ? (
            <div
              className={cn(
                "flex items-center justify-center rounded-[6px] px-1.5 py-0.5 text-xs font-medium w-full h-7",
                selectedOption?.color || "bg-secondary",
                getTextColor(selectedOption?.color)
              )}
            >
              {value}
            </div>
          ) : (
            <div className="h-7 flex items-center px-1.5 text-muted-foreground text-xs">—</div>
          )}
        </div>
      );
    }

    return (
      <div>
        <Select
          value={value || ''}
          onValueChange={(newValue) => {
            onUpdate(rowId, column.id, newValue);
          }}
        >
          <SelectTrigger
            className={cn(
              "h-7 text-xs border-none shadow-none px-1.5 w-full focus:ring-0 focus:ring-offset-0 focus:outline-none",
              selectedOption ? selectedOption.color : "bg-transparent",
              selectedOption ? getTextColor(selectedOption.color) : "",
              // Add hover effect brightness/opacity
              selectedOption && "hover:opacity-90 transition-opacity"
            )}
            hideIcon={true}
          >
            <div className="flex items-center gap-2 w-full justify-center">
              <span className={cn("truncate font-medium", !value && "text-muted-foreground", !value && "text-xs font-normal")}>
                {value || "Select..."}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {options.map((opt: any, idx: number) => (
              <SelectItem key={idx} value={opt.label}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", opt.color)} />
                  <span>{opt.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isReadOnly) {
    // Read-only display
    if (column.column_type === 'checkbox') {
      return (
        <div className="flex items-center justify-center">
          <Checkbox checked={value === 'true' || value === '1'} disabled className="h-4 w-4" />
        </div>
      );
    }
    if (column.column_type === 'url' && value) {
      const shortText = getShortUrlText(value);
      return (
        <div className="min-w-0 max-w-full">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 min-w-0 max-w-full text-xs"
            title={value}
          >
            <span className="truncate">{shortText}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      );
    }
    if (column.column_type === 'date' && value) {
      try {
        const date = parseDateLocal(value);
        return <div className="text-xs">{formatDateLocal(date)}</div>;
      } catch {
        return <div className="text-xs">{value}</div>;
      }
    }
    return <div className="text-xs">{value || '—'}</div>;
  }

  // Editable cells (other types)
  if (column.column_type === 'checkbox') {
    return (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={value === 'true' || value === '1'}
          onCheckedChange={(checked) => {
            onUpdate(rowId, column.id, checked ? '1' : '0');
          }}
          className="h-4 w-4"
        />
      </div>
    );
  }

  if (column.column_type === 'date') {
    const dateValue = value ? parseDateLocal(value) : undefined;
    return (
      <div>
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-7 text-xs px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
                !dateValue && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {dateValue ? formatDateLocal(dateValue) : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date) => {
                if (date) {
                  // Save date in local timezone format (YYYY-MM-DD)
                  onUpdate(rowId, column.id, formatDateLocal(date));
                  setDatePickerOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (column.column_type === 'number') {
    return (
      <div>
        <Input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
          onClick={() => !isEditing && setIsEditing(true)}
          autoFocus={isEditing}
        />
      </div>
    );
  }

  // Text or URL
  return (
    <div>
      {isEditing ? (
        <Input
          type={column.column_type === 'url' ? 'url' : 'text'}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
          autoFocus
          placeholder={column.column_type === 'url' ? 'https://...' : ''}
        />
      ) : (
        <div
          className="h-7 px-1.5 py-0.5 text-xs border border-transparent rounded hover:border-border cursor-text flex items-center min-h-[28px] min-w-0 max-w-full"
          onClick={() => {
            setIsEditing(true);
            setLocalValue(value || '');
          }}
        >
          {column.column_type === 'url' && value ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 min-w-0 max-w-full"
              onClick={(e) => e.stopPropagation()}
              title={value}
            >
              <span className="truncate">{getShortUrlText(value)}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          ) : (
            <span className={cn(!value ? 'text-muted-foreground' : '', 'truncate')}>
              {value || 'Click to edit'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Sortable Column Header Component
interface SortableColumnHeaderProps {
  column: PMTableColumn;
  isReadOnly: boolean;
  onUpdate: (columnId: string, columnName: string) => void;
  onDelete?: (columnId: string) => void;
  onUpdateConfig?: (columnId: string, config: Record<string, any>) => void;
}

const SortableColumnHeader: React.FC<SortableColumnHeaderProps> = ({
  column,
  isReadOnly,
  onUpdate,
  onDelete,
  onUpdateConfig,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        "px-2 py-1.5 text-left font-semibold text-xs uppercase tracking-wide border-b border-border",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {!isReadOnly && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none p-0.5 hover:bg-muted/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Drag to reorder column"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <EditableColumnHeader
            column={column}
            isReadOnly={isReadOnly}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onUpdateConfig={onUpdateConfig}
            isDragging={isDragging}
          />
        </div>
      </div>
    </th>
  );
};

// Sortable Row Component
interface SortableRowProps {
  row: TableWithData['rows'][0];
  columns: PMTableColumn[];
  isReadOnly: boolean;
  onCellUpdate: (rowId: string, columnId: string, value: string | null) => void;
  onDeleteRow: (rowId: string) => void;
  deleteRowMutation: { isPending: boolean };
}

const SortableRow: React.FC<SortableRowProps> = ({
  row,
  columns,
  isReadOnly,
  onCellUpdate,
  onDeleteRow,
  deleteRowMutation,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border-b border-border hover:bg-secondary/30 transition-colors",
        isDragging && "opacity-50 bg-secondary/50"
      )}
    >
      {!isReadOnly && (
        <td className="px-1 py-0.5 w-8">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Drag to reorder row"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
        </td>
      )}
      {columns.map((column) => {
        const cell = row.cells.find((c) => c.column_id === column.id);
        return (
          <td key={column.id} className="align-top px-1 py-0.5">
            <EditableCell
              column={column}
              value={cell?.value || null}
              rowId={row.id}
              isReadOnly={isReadOnly}
              onUpdate={onCellUpdate}
            />
          </td>
        );
      })}
      {!isReadOnly && (
        <td className="px-1 py-0.5 text-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDeleteRow(row.id)}
            disabled={deleteRowMutation.isPending}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </td>
      )}
    </tr>
  );
};

export const SharedTableView: React.FC<SharedTableViewProps> = ({
  table,
  isReadOnly = false,
  onAddColumn,
  onDeleteColumn,
}) => {
  const updateCellMutation = useUpdateCell();
  const createRowMutation = useCreateRow();
  const deleteRowMutation = useDeleteRow();
  const updateColumnMutation = useUpdateColumn();
  const reorderColumnsMutation = useReorderColumns();
  const reorderRowsMutation = useReorderRows();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Local state for columns and rows order (for optimistic updates)
  const [columnsOrder, setColumnsOrder] = useState<string[]>([]);
  const [rowsOrder, setRowsOrder] = useState<string[]>([]);

  const handleCellUpdate = useCallback(
    (rowId: string, columnId: string, value: string | null) => {
      updateCellMutation.mutate({
        row_id: rowId,
        column_id: columnId,
        value,
      });
    },
    [updateCellMutation]
  );

  const handleColumnNameUpdate = useCallback(
    (columnId: string, columnName: string) => {
      updateColumnMutation.mutate({
        columnId,
        data: { column_name: columnName },
      });
    },
    [updateColumnMutation]
  );

  const handleColumnConfigUpdate = useCallback(
    (columnId: string, config: Record<string, any>) => {
      updateColumnMutation.mutate({
        columnId,
        data: { config },
      });
    },
    [updateColumnMutation]
  );

  const handleAddRow = useCallback(() => {
    createRowMutation.mutate({
      table_id: table.id,
    });
  }, [createRowMutation, table.id]);

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (confirm('Are you sure you want to delete this row?')) {
        deleteRowMutation.mutate(rowId);
      }
    },
    [deleteRowMutation]
  );

  // Sort columns and rows by sort_order
  const sortedColumns = useMemo(
    () => [...table.columns].sort((a, b) => a.sort_order - b.sort_order),
    [table.columns]
  );

  const sortedRows = useMemo(
    () => [...table.rows].sort((a, b) => a.sort_order - b.sort_order),
    [table.rows]
  );

  // Initialize order state when table data changes
  useEffect(() => {
    const currentColumnIds = sortedColumns.map((col) => col.id).sort().join(',');
    const orderColumnIds = [...columnsOrder].sort().join(',');
    
    // Reset if columns changed (added/removed) or if order is empty
    if (columnsOrder.length === 0 || currentColumnIds !== orderColumnIds) {
      setColumnsOrder(sortedColumns.map((col) => col.id));
    }
  }, [sortedColumns, columnsOrder]);

  useEffect(() => {
    const currentRowIds = sortedRows.map((row) => row.id).sort().join(',');
    const orderRowIds = [...rowsOrder].sort().join(',');
    
    // Reset if rows changed (added/removed) or if order is empty
    if (rowsOrder.length === 0 || currentRowIds !== orderRowIds) {
      setRowsOrder(sortedRows.map((row) => row.id));
    }
  }, [sortedRows, rowsOrder]);

  // Get ordered columns and rows based on local state
  const orderedColumns = useMemo(() => {
    if (columnsOrder.length === 0) return sortedColumns;
    return columnsOrder
      .map((id) => sortedColumns.find((col) => col.id === id))
      .filter((col): col is PMTableColumn => col !== undefined)
      .concat(sortedColumns.filter((col) => !columnsOrder.includes(col.id)));
  }, [columnsOrder, sortedColumns]);

  const orderedRows = useMemo(() => {
    if (rowsOrder.length === 0) return sortedRows;
    return rowsOrder
      .map((id) => sortedRows.find((row) => row.id === id))
      .filter((row): row is TableWithData['rows'][0] => row !== undefined)
      .concat(sortedRows.filter((row) => !rowsOrder.includes(row.id)));
  }, [rowsOrder, sortedRows]);

  // Handle column drag end
  const handleColumnDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = columnsOrder.indexOf(active.id as string);
      const newIndex = columnsOrder.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(columnsOrder, oldIndex, newIndex);
        setColumnsOrder(newOrder);

        // Update in database
        reorderColumnsMutation.mutate({
          tableId: table.id,
          columnIds: newOrder,
        });
      }
    },
    [columnsOrder, table.id, reorderColumnsMutation]
  );

  // Handle row drag end
  const handleRowDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = rowsOrder.indexOf(active.id as string);
      const newIndex = rowsOrder.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(rowsOrder, oldIndex, newIndex);
        setRowsOrder(newOrder);

        // Update in database
        reorderRowsMutation.mutate({
          tableId: table.id,
          rowIds: newOrder,
        });
      }
    },
    [rowsOrder, table.id, reorderRowsMutation]
  );

  const handleExportToExcel = useCallback(() => {
    try {
      // Prepare headers
      const headers = orderedColumns.map((col) => col.column_name);

      // Prepare data rows
      const dataRows = orderedRows.map((row) => {
        return orderedColumns.map((column) => {
          const cell = row.cells.find((c) => c.column_id === column.id);
          return formatCellValueForExport(column, cell?.value || null);
        });
      });

      // Create worksheet
      const worksheetData = [headers, ...dataRows];
      const worksheet = utils.aoa_to_sheet(worksheetData);

      // Set column widths
      const columnWidths = orderedColumns.map(() => ({ wch: 15 }));
      worksheet['!cols'] = columnWidths;

      // Create workbook
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      // Generate filename
      const fileName = `${table.name.replace(/[^a-z0-9]/gi, '_')}_${formatDateLocal(new Date())}.xlsx`;

      // Download file
      writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  }, [orderedColumns, orderedRows, table.name]);

  return (
    <Card className="rounded-[14px] border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-2.5 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{table.name}</h2>
            {table.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{table.description}</p>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportToExcel}
              className="rounded-[14px] h-7 text-xs px-2"
              title="Export to Excel"
            >
              <Download className="h-3 w-3 mr-1" />
              Export Excel
            </Button>
            {!isReadOnly && (
              <>
                {onAddColumn && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onAddColumn}
                    className="rounded-[14px] h-7 text-xs px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Column
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddRow}
                  disabled={createRowMutation.isPending}
                  className="rounded-[14px] h-7 text-xs px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Row
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            // Determine if it's a column or row drag based on the active element
            const activeId = event.active.id as string;
            if (columnsOrder.includes(activeId)) {
              handleColumnDragEnd(event);
            } else if (rowsOrder.includes(activeId)) {
              handleRowDragEnd(event);
            }
          }}
        >
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {!isReadOnly && <col style={{ width: '32px', minWidth: '32px' }} />}
              {orderedColumns.map((_, index) => {
                // Calculate equal width for data columns, accounting for actions column
                const actionsColWidth = isReadOnly ? 0 : 40;
                const dragHandleWidth = isReadOnly ? 0 : 32;
                const dataColsCount = orderedColumns.length;
                const colWidth = `calc((100% - ${actionsColWidth + dragHandleWidth}px) / ${dataColsCount})`;
                return <col key={index} style={{ width: colWidth }} />;
              })}
              {!isReadOnly && <col style={{ width: '40px', minWidth: '40px' }} />}
            </colgroup>
            <thead className="bg-secondary sticky top-0 z-10">
              <tr>
                {!isReadOnly && (
                  <th className="px-1 py-1.5 text-center font-semibold text-xs uppercase tracking-wide border-b border-border w-8">
                    {/* Drag handle column header */}
                  </th>
                )}
                <SortableContext
                  items={orderedColumns.map((col) => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {orderedColumns.map((column) => (
                    <SortableColumnHeader
                      key={column.id}
                      column={column}
                      isReadOnly={isReadOnly}
                      onUpdate={handleColumnNameUpdate}
                      onDelete={!isReadOnly && onDeleteColumn ? onDeleteColumn : undefined}
                      onUpdateConfig={!isReadOnly ? handleColumnConfigUpdate : undefined}
                    />
                  ))}
                </SortableContext>
                {!isReadOnly && (
                  <th className="px-1 py-1.5 text-center font-semibold text-xs uppercase tracking-wide border-b border-border w-10">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="group">
              {orderedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={orderedColumns.length + (isReadOnly ? 0 : 2)}
                    className="px-2 py-4 text-center text-muted-foreground text-xs"
                  >
                    No rows yet. {!isReadOnly && 'Click "Add Row" to get started.'}
                  </td>
                </tr>
              ) : (
                <SortableContext
                  items={orderedRows.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedRows.map((row) => (
                    <SortableRow
                      key={row.id}
                      row={row}
                      columns={orderedColumns}
                      isReadOnly={isReadOnly}
                      onCellUpdate={handleCellUpdate}
                      onDeleteRow={handleDeleteRow}
                      deleteRowMutation={deleteRowMutation}
                    />
                  ))}
                </SortableContext>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </Card>
  );
};

