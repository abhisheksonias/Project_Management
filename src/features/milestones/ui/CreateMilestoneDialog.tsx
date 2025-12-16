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
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  type BillingType = 'fixed' | 'hourly';

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [sortOrder, setSortOrder] = useState('');
  const [description, setDescription] = useState('');
  const [billingType, setBillingType] = useState<BillingType>('fixed');
  const [allottedHours, setAllottedHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const createMilestone = useCreateMilestone();

  const isSubmitDisabled =
    !name.trim() ||
    createMilestone.isPending ||
    (billingType === 'fixed'
      ? !amount.trim()
      : !allottedHours.trim() || !hourlyRate.trim());

  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (billingType === 'fixed') {
      if (!amount.trim()) return;
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue < 0) return;

      try {
        await createMilestone.mutateAsync({
          name: name.trim(),
          project_id: projectId,
          amount: amountValue,
          currency,
          sort_order: sortOrder ? parseInt(sortOrder, 10) : null,
          description: description ? description.trim() : null,
          is_hourly: false,
          allotted_hours: null,
          hourly_rate: null,
        });
        resetForm();
      } catch (error) {
        // handled by mutation
      }
      return;
    }

    // Hourly validation
    if (!allottedHours.trim() || !hourlyRate.trim()) return;
    const allottedValue = parseFloat(allottedHours);
    const hourlyValue = parseFloat(hourlyRate);
    if (isNaN(allottedValue) || allottedValue <= 0) return;
    if (isNaN(hourlyValue) || hourlyValue <= 0) return;

    try {
      await createMilestone.mutateAsync({
        name: name.trim(),
        project_id: projectId,
        currency,
        sort_order: sortOrder ? parseInt(sortOrder, 10) : null,
        description: description ? description.trim() : null,
        is_hourly: true,
        allotted_hours: allottedValue,
        hourly_rate: hourlyValue,
      });
      resetForm();
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setCurrency('INR');
    setSortOrder('');
    setDescription('');
    setBillingType('fixed');
    setAllottedHours('');
    setHourlyRate('');
    onSuccess?.();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createMilestone.isPending) {
      setName('');
      setAmount('');
      setCurrency('INR');
      setSortOrder('');
      setDescription('');
      setBillingType('fixed');
      setAllottedHours('');
      setHourlyRate('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[14px]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Create Milestone</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add a new milestone to track project progress. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
              Milestone Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Phase 1 Payment"
              className="rounded-[14px] text-sm h-9 sm:h-10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
              Billing Type
            </label>
            <ToggleGroup
              type="single"
              value={billingType}
              onValueChange={(value) => value && setBillingType(value as BillingType)}
              className="w-fit rounded-[14px] bg-secondary/50 p-1"
            >
              <ToggleGroupItem
                value="fixed"
                className="px-3 sm:px-4 rounded-[12px] text-xs sm:text-sm data-[state=on]:bg-white data-[state=on]:shadow-sm"
              >
                Fixed
              </ToggleGroupItem>
              <ToggleGroupItem
                value="hourly"
                className="px-3 sm:px-4 rounded-[12px] text-xs sm:text-sm data-[state=on]:bg-white data-[state=on]:shadow-sm"
              >
                Hourly
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {billingType === 'fixed' ? (
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
                  Amount *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-[14px] text-sm h-9 sm:h-10"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
                  Allotted Hours *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={allottedHours}
                  onChange={(e) => setAllottedHours(e.target.value)}
                  placeholder="0"
                  className="rounded-[14px] text-sm h-9 sm:h-10"
                />
              </div>
            )}

            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
                Currency *
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="rounded-[14px] text-sm h-9 sm:h-10">
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

          {billingType === 'hourly' && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
                  Hourly Rate *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.00"
                  className="rounded-[14px] text-sm h-9 sm:h-10"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
                  Estimated Cost
                </label>
                <div className="rounded-[14px] border border-dashed border-secondary/60 px-3 py-2 text-xs sm:text-sm text-muted-foreground">
                  {allottedHours && hourlyRate
                    ? new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency,
                        minimumFractionDigits: 2,
                      }).format(
                        (parseFloat(allottedHours) || 0) * (parseFloat(hourlyRate) || 0)
                      )
                    : '—'}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
              Sort Order
            </label>
            <Input
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="Optional - for ordering milestones"
              className="rounded-[14px] text-sm h-9 sm:h-10"
            />
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              Lower numbers appear first. Leave empty to add at the end.
            </p>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details or payment schedule"
              className="rounded-[14px] text-sm resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-2 sm:pt-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createMilestone.isPending}
            className="rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10"
          >
            {createMilestone.isPending ? 'Creating...' : 'Create Milestone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

