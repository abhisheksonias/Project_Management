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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useUpdateTable } from '../hooks/useSharedTables';
import { UpdateTableData, PMTable } from '../services/sharedTableService';

interface EditTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: PMTable | null;
}

export const EditTableDialog: React.FC<EditTableDialogProps> = ({
  open,
  onOpenChange,
  table,
}) => {
  const [formData, setFormData] = useState<UpdateTableData>({
    name: '',
    description: '',
    is_public: false,
    allow_user_edit: true,
  });

  const updateTableMutation = useUpdateTable();

  useEffect(() => {
    if (table) {
      setFormData({
        name: table.name,
        description: table.description || '',
        is_public: table.is_public,
        allow_user_edit: table.allow_user_edit,
      });
    }
  }, [table, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !table) {
      return;
    }

    try {
      await updateTableMutation.mutateAsync({
        tableId: table.id,
        data: formData,
      });
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
          <DialogTitle>Edit Table</DialogTitle>
          <DialogDescription>
            Update table settings and properties.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Table Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Project Tracker"
                className="rounded-[14px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                className="rounded-[14px]"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public">Public Table</Label>
                <p className="text-xs text-muted-foreground">
                  Allow public access via shareable link
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_public: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow_user_edit">Allow User Editing</Label>
                <p className="text-xs text-muted-foreground">
                  Let users edit table content
                </p>
              </div>
              <Switch
                id="allow_user_edit"
                checked={formData.allow_user_edit}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_user_edit: checked })
                }
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
              disabled={!formData.name?.trim() || updateTableMutation.isPending}
              className="rounded-[14px]"
            >
              {updateTableMutation.isPending ? 'Updating...' : 'Update Table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

