import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangeOption } from '../services/adminService';
import { format } from 'date-fns';

interface AdminDateRangeFiltersProps {
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
  tempStartDate: Date | undefined;
  tempEndDate: Date | undefined;
  onTempDateChange: (range: { from?: Date; to?: Date }) => void;
  onConfirmDateRange: () => void;
  onResetDateRange: () => void;
  isDatePickerOpen: boolean;
  onDatePickerOpenChange: (open: boolean) => void;
  currentMonth: Date;
}

export const AdminDateRangeFilters: React.FC<AdminDateRangeFiltersProps> = ({
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
  const dateRangeOptions: Array<{ value: DateRangeOption; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'this-year', label: 'This Year' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {dateRangeOptions.map((option) => (
        <Button
          key={option.value}
          variant={dateRange === option.value ? 'outline' : 'ghost'}
          size="sm"
          className={cn(
            'rounded-[14px] h-9 text-sm',
            dateRange === option.value
              ? 'border-primary text-primary bg-primary/5'
              : 'border-secondary text-muted-foreground hover:bg-secondary bg-secondary'
          )}
          onClick={() => onDateRangeChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
      <Popover open={isDatePickerOpen} onOpenChange={onDatePickerOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant={dateRange === 'custom' ? 'outline' : 'ghost'}
            size="sm"
            className={cn(
              'rounded-[14px] h-9 text-sm border',
              dateRange === 'custom'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-secondary text-muted-foreground hover:bg-secondary bg-secondary'
            )}
            onClick={() => {
              onDateRangeChange('custom');
              onDatePickerOpenChange(true);
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {tempStartDate && tempEndDate
              ? `${format(tempStartDate, 'MMM d')} - ${format(tempEndDate, 'MMM d')}`
              : 'Custom Range'}
          </Button>
        </PopoverTrigger>
        {dateRange === 'custom' && (
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
              <div className="border-t p-3 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onResetDateRange}
                >
                  Reset
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onConfirmDateRange}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Apply
                </Button>
              </div>
            )}
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};

