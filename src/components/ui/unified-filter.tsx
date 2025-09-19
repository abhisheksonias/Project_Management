import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useFilter, FilterValue } from '@/contexts/FilterContext';

interface UnifiedFilterProps {
  onRefresh?: () => void;
  className?: string;
}

export const UnifiedFilter: React.FC<UnifiedFilterProps> = ({ onRefresh, className }) => {
  const { filterValue, setFilterValue } = useFilter();
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  const handleFilterChange = (type: FilterValue['type']) => {
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
        // This week - from start of current week to end of current week
        const startOfWeek = new Date(indianTime);
        startOfWeek.setDate(indianTime.getDate() - indianTime.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        endOfWeek.setHours(23, 59, 59, 999);
        
        startDate = startOfWeek;
        endDate = endOfWeek;
        break;
      case 'month':
        // This month - from start of current month to end of current month
        startDate = new Date(indianTime.getFullYear(), indianTime.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(indianTime.getFullYear(), indianTime.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarter':
        // This quarter - from start of current quarter to end of current quarter
        const quarterStartMonth = Math.floor(indianTime.getMonth() / 3) * 3;
        startDate = new Date(indianTime.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
        endDate = new Date(indianTime.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
        break;
      case 'year':
        // This year - from start of current year to end of current year
        startDate = new Date(indianTime.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(indianTime.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        // Keep existing dates for custom
        startDate = filterValue.startDate || new Date();
        endDate = filterValue.endDate || new Date();
        break;
      default:
        startDate = new Date();
        endDate = new Date();
    }

    setFilterValue({
      type,
      startDate,
      endDate
    });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    if (!date) return;
    
    const newValue = { ...filterValue };
    if (field === 'startDate') {
      newValue.startDate = date;
      newValue.startDate.setHours(0, 0, 0, 0);
    } else {
      newValue.endDate = date;
      newValue.endDate.setHours(23, 59, 59, 999);
    }
    
    setFilterValue(newValue);
  };


  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Main Filter Selector */}
      <Select value={filterValue.type} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range Picker */}
      {filterValue.type === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-40 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterValue.startDate ? format(filterValue.startDate, 'MMM dd, yyyy') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterValue.startDate || undefined}
                onSelect={(date) => {
                  handleCustomDateChange('startDate', date);
                  setIsCustomDateOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-40 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterValue.endDate ? format(filterValue.endDate, 'MMM dd, yyyy') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterValue.endDate || undefined}
                onSelect={(date) => handleCustomDateChange('endDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}


      {/* Refresh Button */}
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
