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
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {selectedCount} of {totalCount} items selected
      </p>
      <div className="flex gap-2">
        {canEdit && (
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/5"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </Button>
        )}
        <Button 
          variant="outline" 
          className="border-secondary"
          onClick={onExport}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
};

