import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDuplicateTable } from '../hooks/useSharedTables';
import { PMTable } from '../services/sharedTableService';

interface DuplicateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: PMTable | null;
}

export const DuplicateTableDialog: React.FC<DuplicateTableDialogProps> = ({
  open,
  onOpenChange,
  table,
}) => {
  const [newName, setNewName] = useState('');
  const duplicateTableMutation = useDuplicateTable();

  useEffect(() => {
    if (table) {
      setNewName(`${table.name} (Copy)`);
    }
  }, [table, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !table) {
      return;
    }

    try {
      await duplicateTableMutation.mutateAsync({
        tableId: table.id,
        newName: newName.trim(),
      });
      setNewName('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[14px] w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Duplicate Table</DialogTitle>
          <DialogDescription>
            Create a copy of "{table.name}" with all columns, rows, and data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">New Table Name *</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter table name"
                className="rounded-[14px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-[14px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newName.trim() || duplicateTableMutation.isPending}
              className="rounded-[14px]"
            >
              {duplicateTableMutation.isPending ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

