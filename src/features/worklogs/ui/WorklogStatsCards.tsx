import React from 'react';
import { Card } from '@/components/ui/card';

interface WorklogStatsCardsProps {
  totalHours: string;
  billableHours: string;
  nonBillableHours: string;
  entries: number;
}

export const WorklogStatsCards: React.FC<WorklogStatsCardsProps> = ({
  totalHours,
  billableHours,
  nonBillableHours,
  entries,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
        <p className="text-2xl font-bold">{totalHours}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">Billable Hours</p>
        <p className="text-2xl font-bold">{billableHours}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">Non-billable Hours</p>
        <p className="text-2xl font-bold">{nonBillableHours}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">Entries</p>
        <p className="text-2xl font-bold">{entries}</p>
      </Card>
    </div>
  );
};

