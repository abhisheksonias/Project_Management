import React from 'react';
import { Milestone } from '../services/milestoneService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2 } from 'lucide-react';
import { useDeleteMilestone } from '../hooks/useMilestoneMutations';

const formatCurrency = (amount: number, currency: string): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

interface MilestoneListProps {
  milestones: Milestone[];
  projectId: string;
  onEdit?: (milestone: Milestone) => void;
}

export const MilestoneList: React.FC<MilestoneListProps> = ({
  milestones,
  projectId,
  onEdit,
}) => {
  const deleteMilestone = useDeleteMilestone();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this milestone? Tasks linked to it will have their milestone set to null.')) {
      try {
        await deleteMilestone.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation hook
      }
    }
  };

  if (milestones.length === 0) {
    return (
      <Card className="rounded-[14px]">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            No milestones created yet. Create one to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone) => (
        <Card key={milestone.id} className="rounded-[14px]">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {milestone.name}
                  </CardTitle>
                  {milestone.sort_order !== null && (
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                      #{milestone.sort_order}
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-primary mt-2">
                  {formatCurrency(milestone.amount, milestone.currency)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(milestone)}
                    className="h-8 w-8 rounded-[14px]"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(milestone.id)}
                  disabled={deleteMilestone.isPending}
                  className="h-8 w-8 rounded-[14px] text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

