import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useMilestonesByProject } from '@/features/milestones/hooks/useMilestones';
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

  const { data: milestones = [], isLoading } = useMilestonesByProject(projectId);
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setEditName(milestone.name);
    setEditAmount(milestone.amount.toString());
    setEditCurrency(milestone.currency);
    setEditSortOrder(milestone.sort_order?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMilestone || !editName.trim() || !editAmount.trim()) return;

    const amountValue = parseFloat(editAmount);
    if (isNaN(amountValue) || amountValue < 0) {
      return;
    }

    try {
      await updateMilestone.mutateAsync({
        id: editingMilestone.id,
        data: {
          name: editName.trim(),
          amount: amountValue,
          currency: editCurrency,
          sort_order: editSortOrder ? parseInt(editSortOrder, 10) : null,
        },
      });
      setEditingMilestone(null);
      setEditName('');
      setEditAmount('');
      setEditCurrency('INR');
      setEditSortOrder('');
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
  };

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

            <div className="grid grid-cols-2 gap-4">
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
              disabled={!editName.trim() || !editAmount.trim() || updateMilestone.isPending}
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

