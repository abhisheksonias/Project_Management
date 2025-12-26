import React, { useState } from 'react';
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
import { useCreateTable } from '../hooks/useSharedTables';
import { CreateTableData } from '../services/sharedTableService';

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTableDialog: React.FC<CreateTableDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [formData, setFormData] = useState<CreateTableData>({
    name: '',
    description: '',
    is_public: false,
    allow_user_edit: true,
  });

  const createTableMutation = useCreateTable();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    try {
      await createTableMutation.mutateAsync(formData);
      setFormData({
        name: '',
        description: '',
        is_public: false,
        allow_user_edit: true,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[14px] w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Table</DialogTitle>
          <DialogDescription>
            Create a new shared table with dynamic columns and rows.
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
              disabled={!formData.name.trim() || createTableMutation.isPending}
              className="rounded-[14px]"
            >
              {createTableMutation.isPending ? 'Creating...' : 'Create Table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

