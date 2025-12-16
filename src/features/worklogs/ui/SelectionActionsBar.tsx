import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';

interface SelectionActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onExport: () => void;
  isDeleting: boolean;
  canEdit?: boolean;
}

export const SelectionActionsBar: React.FC<SelectionActionsBarProps> = ({
  selectedCount,
  totalCount,
  onDelete,
  onExport,
  isDeleting,
  canEdit = true,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
      <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        {selectedCount} of {totalCount} items selected
      </p>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {canEdit && (
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/5 w-full sm:w-auto text-sm h-9 sm:h-10"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </Button>
        )}
        <Button 
          variant="outline" 
          className="border-secondary w-full sm:w-auto text-sm h-9 sm:h-10"
          onClick={onExport}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
};

