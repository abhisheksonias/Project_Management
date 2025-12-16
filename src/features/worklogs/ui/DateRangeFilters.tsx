import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangeFiltersProps {
  dateRange: 'Today' | 'This Week' | 'This Month' | 'Last Month' | 'Date Range';
  onDateRangeChange: (range: 'Today' | 'This Week' | 'This Month' | 'Last Month' | 'Date Range') => void;
  tempStartDate: Date | undefined;
  tempEndDate: Date | undefined;
  onTempDateChange: (range: { from?: Date; to?: Date }) => void;
  onConfirmDateRange: () => void;
  onResetDateRange: () => void;
  isDatePickerOpen: boolean;
  onDatePickerOpenChange: (open: boolean) => void;
  currentMonth: Date;
}

export const DateRangeFilters: React.FC<DateRangeFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  tempStartDate,
  tempEndDate,
  onTempDateChange,
  onConfirmDateRange,
  onResetDateRange,
  isDatePickerOpen,
  onDatePickerOpenChange,
  currentMonth,
}) => {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {['Today', 'This Week', 'This Month', 'Last Month'].map((range) => (
        <Button
          key={range}
          variant={dateRange === range ? 'outline' : 'ghost'}
          className={cn(
            'rounded-full border text-xs sm:text-sm h-8 sm:h-9',
            dateRange === range 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-secondary text-muted-foreground hover:bg-secondary'
          )}
          onClick={() => onDateRangeChange(range as any)}
        >
          {range}
        </Button>
      ))}
      <Popover open={isDatePickerOpen} onOpenChange={onDatePickerOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant={dateRange === 'Date Range' ? 'outline' : 'ghost'}
            className={cn(
              'rounded-full border text-xs sm:text-sm h-8 sm:h-9',
              dateRange === 'Date Range'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-secondary text-muted-foreground hover:bg-secondary'
            )}
            onClick={() => {
              onDateRangeChange('Date Range');
              onDatePickerOpenChange(true);
            }}
          >
            <Calendar className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Date Range</span>
            <span className="sm:hidden">Range</span>
          </Button>
        </PopoverTrigger>
        {dateRange === 'Date Range' && (
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={currentMonth}
              selected={{
                from: tempStartDate,
                to: tempEndDate,
              }}
              onSelect={(range) => {
                if (range?.from === undefined && range?.to === undefined) {
                  onTempDateChange({ from: undefined, to: undefined });
                } else {
                  onTempDateChange({ from: range?.from, to: range?.to });
                }
              }}
              numberOfMonths={2}
            />
            {(tempStartDate || tempEndDate) && (
              <div className="border-t p-2 sm:p-3 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={onResetDateRange}
                >
                  Reset
                </Button>
                <Button
                  className="flex-1 bg-primary text-white hover:bg-primary/90 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={onConfirmDateRange}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Go
                </Button>
              </div>
            )}
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};

