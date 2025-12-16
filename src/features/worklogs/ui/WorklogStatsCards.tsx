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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Hours</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalHours}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Billable Hours</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{billableHours}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Non-billable Hours</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{nonBillableHours}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Entries</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold">{entries}</p>
      </Card>
    </div>
  );
};

