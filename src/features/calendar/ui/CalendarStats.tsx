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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-primary" />
          <span className="text-xs sm:text-sm">Billable</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-gray-400" />
          <span className="text-xs sm:text-sm">Non-billable</span>
        </div>
      </div>
      {/* <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold flex-wrap">
        <span>Billable: <span className="text-primary">{billableHours}h</span></span>
        <span>Non-billable: <span className="text-muted-foreground">{nonBillableHours}h</span></span>
        <span>Total: <span className="text-primary">{totalHours}h</span></span>
      </div> */}
    </div>
  );
};

