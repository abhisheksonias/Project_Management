import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateFilterValue {
  type: 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate: Date;
  endDate: Date;
  customDate?: Date;
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  onRefresh?: () => void;
  className?: string;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  value,
  onChange,
  onRefresh,
  className
}) => {
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  const handleTypeChange = (type: string) => {
    // Get current time in Indian timezone
    const now = new Date();
    const indianTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case 'today':
        startDate = new Date(indianTime);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(indianTime);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(indianTime);
        startDate.setDate(indianTime.getDate() - indianTime.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(indianTime.getFullYear(), indianTime.getMonth(), 1);
        endDate = new Date(indianTime.getFullYear(), indianTime.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(indianTime.getFullYear(), 0, 1);
        endDate = new Date(indianTime.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        startDate = value.startDate;
        endDate = value.endDate;
        break;
      default:
        startDate = value.startDate;
        endDate = value.endDate;
    }

    onChange({
      type: type as any,
      startDate,
      endDate,
      customDate: type === 'custom' ? value.customDate : undefined
    });
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    if (date) {
      // Convert to Indian timezone
      const indianDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      const startDate = new Date(indianDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(indianDate);
      endDate.setHours(23, 59, 59, 999);

      onChange({
        type: 'custom',
        startDate,
        endDate,
        customDate: date
      });
      setIsCustomDateOpen(false);
    }
  };

  const getDisplayText = () => {
    switch (value.type) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'year':
        return 'This Year';
      case 'custom':
        return value.customDate ? format(value.customDate, 'MMM dd, yyyy') : 'Custom Date';
      default:
        return 'Select Date';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={value.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="custom">Custom Date</SelectItem>
        </SelectContent>
      </Select>

      {value.type === 'custom' && (
        <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !value.customDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.customDate ? format(value.customDate, "MMM dd, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.customDate}
              onSelect={handleCustomDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-9 px-3"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
