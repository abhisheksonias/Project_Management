import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  useMilestonesByProject,
  useMilestoneHoursSummary,
} from '@/features/milestones/hooks/useMilestones';
import { CreateMilestoneDialog } from '@/features/milestones/ui/CreateMilestoneDialog';
import { MilestoneList } from '@/features/milestones/ui/MilestoneList';
import { Milestone } from '@/features/milestones/services/milestoneService';
import { useUpdateMilestone, useDeleteMilestone } from '@/features/milestones/hooks/useMilestoneMutations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

interface MilestonesTabContentProps {
  projectId: string;
}

export const MilestonesTabContent: React.FC<MilestonesTabContentProps> = ({ projectId }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('INR');
  const [editSortOrder, setEditSortOrder] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBillingType, setEditBillingType] = useState<'fixed' | 'hourly'>('fixed');
  const [editAllottedHours, setEditAllottedHours] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');

  const { data: milestones = [], isLoading } = useMilestonesByProject(projectId);
  const milestoneIds = useMemo(() => milestones.map((m) => m.id), [milestones]);
  const { data: milestoneHoursSummary = {} } = useMilestoneHoursSummary(milestoneIds, {
    enabled: milestoneIds.length > 0,
  });
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setEditName(milestone.name);
    setEditAmount(milestone.amount.toString());
    setEditCurrency(milestone.currency);
    setEditSortOrder(milestone.sort_order?.toString() || '');
    setEditDescription(milestone.description || '');
    setEditBillingType(milestone.is_hourly ? 'hourly' : 'fixed');
    setEditAllottedHours(milestone.allotted_hours?.toString() || '');
    setEditHourlyRate(milestone.hourly_rate?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMilestone || !editName.trim()) return;

    const isHourly = editBillingType === 'hourly';
    const payload: Record<string, any> = {
      name: editName.trim(),
      currency: editCurrency,
      sort_order: editSortOrder ? parseInt(editSortOrder, 10) : null,
      description: editDescription ? editDescription.trim() : null,
      is_hourly: isHourly,
    };

    if (isHourly) {
      if (!editAllottedHours.trim() || !editHourlyRate.trim()) return;
      const allottedValue = parseFloat(editAllottedHours);
      const hourlyValue = parseFloat(editHourlyRate);
      if (isNaN(allottedValue) || allottedValue <= 0) return;
      if (isNaN(hourlyValue) || hourlyValue <= 0) return;
      payload.allotted_hours = allottedValue;
      payload.hourly_rate = hourlyValue;
      payload.amount = allottedValue * hourlyValue;
    } else {
      if (!editAmount.trim()) return;
      const amountValue = parseFloat(editAmount);
      if (isNaN(amountValue) || amountValue < 0) return;
      payload.amount = amountValue;
      payload.allotted_hours = null;
      payload.hourly_rate = null;
    }

    try {
      await updateMilestone.mutateAsync({
        id: editingMilestone.id,
        data: payload,
      });
      setEditingMilestone(null);
      setEditName('');
      setEditAmount('');
      setEditCurrency('INR');
      setEditSortOrder('');
      setEditDescription('');
      setEditBillingType('fixed');
      setEditAllottedHours('');
      setEditHourlyRate('');
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleCancelEdit = () => {
    setEditingMilestone(null);
    setEditName('');
    setEditAmount('');
    setEditCurrency('INR');
    setEditSortOrder('');
    setEditDescription('');
    setEditBillingType('fixed');
    setEditAllottedHours('');
    setEditHourlyRate('');
  };

  const isEditDisabled =
    !editName.trim() ||
    updateMilestone.isPending ||
    (editBillingType === 'fixed'
      ? !editAmount.trim()
      : !editAllottedHours.trim() || !editHourlyRate.trim());

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-secondary rounded-[14px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Project Milestones</h3>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Milestone
        </Button>
      </div>

      <MilestoneList
        milestones={milestones}
        projectId={projectId}
        onEdit={handleEdit}
        hourlySummary={milestoneHoursSummary}
      />

      <CreateMilestoneDialog
        open={isCreateDialogOpen}
        projectId={projectId}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Edit Milestone Dialog */}
      <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[600px] rounded-[14px]">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>
              Update milestone details. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Milestone Name *
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Phase 1 Payment"
                className="rounded-[14px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground mb-1 block">
                Billing Type
              </label>
              <ToggleGroup
                type="single"
                value={editBillingType}
                onValueChange={(value) => value && setEditBillingType(value as 'fixed' | 'hourly')}
                className="w-fit rounded-[14px] bg-secondary/50 p-1"
              >
                <ToggleGroupItem
                  value="fixed"
                  className="px-4 rounded-[12px] data-[state=on]:bg-white data-[state=on]:shadow-sm"
                >
                  Fixed
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="hourly"
                  className="px-4 rounded-[12px] data-[state=on]:bg-white data-[state=on]:shadow-sm"
                >
                  Hourly
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {editBillingType === 'fixed' ? (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Amount *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="0.00"
                    className="rounded-[14px]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Allotted Hours *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editAllottedHours}
                    onChange={(e) => setEditAllottedHours(e.target.value)}
                    placeholder="0"
                    className="rounded-[14px]"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Currency *
                </label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
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

            {editBillingType === 'hourly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Hourly Rate *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(e.target.value)}
                    placeholder="0.00"
                    className="rounded-[14px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Estimated Cost
                  </label>
                  <div className="rounded-[14px] border border-dashed border-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                    {editAllottedHours && editHourlyRate
                      ? new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: editCurrency,
                          minimumFractionDigits: 2,
                        }).format(
                          (parseFloat(editAllottedHours) || 0) * (parseFloat(editHourlyRate) || 0)
                        )
                      : '—'}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Sort Order
              </label>
              <Input
                type="number"
                min="0"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(e.target.value)}
                placeholder="Optional - for ordering milestones"
                className="rounded-[14px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers appear first. Leave empty to add at the end.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Description
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Additional details"
                className="rounded-[14px]"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={updateMilestone.isPending}
              className="rounded-[14px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isEditDisabled}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
            >
              {updateMilestone.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

