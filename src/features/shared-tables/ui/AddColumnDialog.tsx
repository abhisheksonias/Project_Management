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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateColumn } from '../hooks/useSharedTables';
import { CreateColumnData } from '../services/sharedTableService';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
}

const COLORS = [
  { label: 'Slate', value: 'bg-slate-500' },
  { label: 'Red', value: 'bg-red-500' },
  { label: 'Orange', value: 'bg-orange-500' },
  { label: 'Amber', value: 'bg-amber-500' },
  { label: 'Green', value: 'bg-green-500' },
  { label: 'Emerald', value: 'bg-emerald-500' },
  { label: 'Teal', value: 'bg-teal-500' },
  { label: 'Cyan', value: 'bg-cyan-500' },
  { label: 'Blue', value: 'bg-blue-500' },
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Violet', value: 'bg-violet-500' },
  { label: 'Purple', value: 'bg-purple-500' },
  { label: 'Pink', value: 'bg-pink-500' },
  { label: 'Rose', value: 'bg-rose-500' },
];

interface DropdownOption {
  label: string;
  color: string;
}

export const AddColumnDialog: React.FC<AddColumnDialogProps> = ({
  open,
  onOpenChange,
  tableId,
}) => {
  const [formData, setFormData] = useState<CreateColumnData>({
    table_id: tableId,
    column_name: '',
    column_type: 'text',
    is_required: false,
  });

  // For Dropdown type
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionColor, setNewOptionColor] = useState(COLORS[0].value);

  const createColumnMutation = useCreateColumn();

  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;
    setOptions([
      ...options,
      { label: newOptionLabel.trim(), color: newOptionColor },
    ]);
    setNewOptionLabel('');
    setNewOptionColor(COLORS[0].value);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.column_name.trim()) {
      return;
    }

    try {
      const config =
        formData.column_type === 'dropdown'
          ? {
              options: options, // New structure: [{ label, color }]
            }
          : null;

      await createColumnMutation.mutateAsync({
        ...formData,
        config,
      });

      // Reset
      setFormData({
        table_id: tableId,
        column_name: '',
        column_type: 'text',
        is_required: false,
      });
      setOptions([]);
      setNewOptionLabel('');
      setNewOptionColor(COLORS[0].value);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Reset local state when dialog closes/opens
  React.useEffect(() => {
    if (!open) {
      setOptions([]);
      setNewOptionLabel('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[14px] w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Column</DialogTitle>
          <DialogDescription>
            Add a new column to your table with a specific data type.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column_name">Column Name *</Label>
              <Input
                id="column_name"
                value={formData.column_name}
                onChange={(e) =>
                  setFormData({ ...formData, column_name: e.target.value })
                }
                placeholder="e.g., Status, Priority, Date"
                className="rounded-[14px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="column_type">Column Type *</Label>
              <Select
                value={formData.column_type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, column_type: value })
                }
              >
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.column_type === 'dropdown' && (
              <div className="space-y-3 p-3 bg-secondary/20 rounded-[14px] border border-border">
                <Label>Dropdown Options</Label>
                
                {/* List of added options */}
                <div className="space-y-2 mb-2">
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-background rounded-md border text-sm"
                    >
                      <div
                        className={cn('w-4 h-4 rounded-full flex-shrink-0', opt.color)}
                      />
                      <span className="flex-1 font-medium">{opt.label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(idx)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {options.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No options added yet.
                    </div>
                  )}
                </div>

                {/* Add new option */}
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Option label"
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Select value={newOptionColor} onValueChange={setNewOptionColor}>
                      <SelectTrigger className="w-[50px] h-8 px-2">
                        <div className={cn("w-4 h-4 rounded-full", newOptionColor)} />
                      </SelectTrigger>
                      <SelectContent align="end" className="w-[180px]">
                        <div className="grid grid-cols-5 gap-1 p-1">
                          {COLORS.map((color) => (
                            <SelectItem
                              key={color.value}
                              value={color.value}
                              className="w-8 h-8 p-0 flex justify-center items-center cursor-pointer focus:bg-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewOptionColor(color.value);
                              }}
                            >
                              <div className={cn("w-5 h-5 rounded-full cursor-pointer", color.value)} />
                              <span className="sr-only">{color.label}</span>
                            </SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddOption}
                    disabled={!newOptionLabel.trim()}
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) =>
                  setFormData({ ...formData, is_required: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_required" className="text-sm">
                Required field
              </Label>
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
              disabled={
                !formData.column_name.trim() ||
                (formData.column_type === 'dropdown' && options.length === 0) ||
                createColumnMutation.isPending
              }
              className="rounded-[14px]"
            >
              {createColumnMutation.isPending ? 'Adding...' : 'Add Column'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

