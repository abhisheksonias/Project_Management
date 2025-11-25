import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateMilestone } from '../hooks/useMilestoneMutations';

interface CreateMilestoneDialogProps {
  open: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export const CreateMilestoneDialog: React.FC<CreateMilestoneDialogProps> = ({
  open,
  projectId,
  onOpenChange,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [sortOrder, setSortOrder] = useState('');

  const createMilestone = useCreateMilestone();

  const handleSubmit = async () => {
    if (!name.trim() || !amount.trim()) {
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 0) {
      return;
    }

    try {
      await createMilestone.mutateAsync({
        name: name.trim(),
        project_id: projectId,
        amount: amountValue,
        currency: currency,
        sort_order: sortOrder ? parseInt(sortOrder, 10) : null,
      });

      // Reset form
      setName('');
      setAmount('');
      setCurrency('INR');
      setSortOrder('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createMilestone.isPending) {
      setName('');
      setAmount('');
      setCurrency('INR');
      setSortOrder('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Create Milestone</DialogTitle>
          <DialogDescription>
            Add a new milestone to track project progress. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Milestone Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Phase 1 Payment"
              className="rounded-[14px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Amount *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-[14px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Currency *
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="rounded-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[14px]">
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Sort Order
            </label>
            <Input
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="Optional - for ordering milestones"
              className="rounded-[14px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower numbers appear first. Leave empty to add at the end.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createMilestone.isPending}
            className="rounded-[14px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !amount.trim() || createMilestone.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
          >
            {createMilestone.isPending ? 'Creating...' : 'Create Milestone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

