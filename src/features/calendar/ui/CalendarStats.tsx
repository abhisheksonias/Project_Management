import React from 'react';

interface CalendarStatsProps {
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
}

export const CalendarStats: React.FC<CalendarStatsProps> = ({
  billableHours,
  nonBillableHours,
  totalHours,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-primary" />
          <span className="text-sm">Billable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-gray-400" />
          <span className="text-sm">Non-billable</span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm font-semibold">
        <span>Billable: <span className="text-primary">{billableHours}h</span></span>
        <span>Non-billable: <span className="text-muted-foreground">{nonBillableHours}h</span></span>
        <span>Total: <span className="text-primary">{totalHours}h</span></span>
      </div>
    </div>
  );
};

