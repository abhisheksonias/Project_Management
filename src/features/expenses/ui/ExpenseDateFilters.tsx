import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export type ExpensePeriodMode = 'month' | 'custom';

interface ExpenseDateFiltersProps {
  mode: ExpensePeriodMode;
  onModeChange: (mode: ExpensePeriodMode) => void;
  monthValue: string;
  onMonthChange: (yyyyMm: string) => void;
  monthOptions: { value: string; label: string }[];
  customFrom?: Date;
  customTo?: Date;
  onCustomRangeChange: (range: { from?: Date; to?: Date }) => void;
  onApplyCustomRange: () => void;
  customPickerOpen: boolean;
  onCustomPickerOpenChange: (open: boolean) => void;
}

export const buildMonthOptions = (count = 24) => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    });
  }
  return options;
};

export const monthToDateRange = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  const start = startOfMonth(new Date(y, m - 1, 1));
  const end = endOfMonth(start);
  return {
    dateFrom: format(start, 'yyyy-MM-dd'),
    dateTo: format(end, 'yyyy-MM-dd'),
    label: format(start, 'MMMM yyyy'),
  };
};

export const ExpenseDateFilters: React.FC<ExpenseDateFiltersProps> = ({
  mode,
  onModeChange,
  monthValue,
  onMonthChange,
  monthOptions,
  customFrom,
  customTo,
  onCustomRangeChange,
  onApplyCustomRange,
  customPickerOpen,
  onCustomPickerOpenChange,
}) => {
  const customLabel =
    customFrom && customTo
      ? `${format(customFrom, 'MMM d, yyyy')} – ${format(customTo, 'MMM d, yyyy')}`
      : 'Pick dates';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'month' ? 'default' : 'outline'}
          className="rounded-[14px] h-9"
          onClick={() => onModeChange('month')}
        >
          By month
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'custom' ? 'default' : 'outline'}
          className="rounded-[14px] h-9"
          onClick={() => onModeChange('custom')}
        >
          Custom range
        </Button>
      </div>

      {mode === 'month' ? (
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Select value={monthValue} onValueChange={onMonthChange}>
            <SelectTrigger className="h-9 rounded-[14px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[14px]">
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <Popover open={customPickerOpen} onOpenChange={onCustomPickerOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-9 justify-start text-left font-normal rounded-[14px] min-w-[240px]',
                  !customFrom && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {customLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-[14px]" align="start">
              <Calendar
                mode="range"
                selected={{ from: customFrom, to: customTo }}
                onSelect={onCustomRangeChange}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-[14px]"
            disabled={!customFrom || !customTo}
            onClick={onApplyCustomRange}
          >
            Apply range
          </Button>
        </div>
      )}
    </div>
  );
};
