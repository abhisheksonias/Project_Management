import { PMTableColumn } from '../services/sharedTableService';
import { formatDateLocal, parseDateLocal } from './dateUtils';

/**
 * Format cell value for Excel export based on column type
 */
export const formatCellValueForExport = (column: PMTableColumn, value: string | null): string => {
  if (!value) return '';
  
  switch (column.column_type) {
    case 'checkbox':
      return value === 'true' || value === '1' ? 'Yes' : 'No';
    case 'date':
      try {
        const date = parseDateLocal(value);
        return formatDateLocal(date);
      } catch {
        return value;
      }
    case 'number':
    case 'url':
    case 'dropdown':
    case 'text':
    default:
      return value;
  }
};

