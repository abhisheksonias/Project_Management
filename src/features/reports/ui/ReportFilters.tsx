import React from 'react';
import { Button } from '@/components/ui/button';
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ReportFilters as ReportFiltersType } from '../services/reportService';

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
  projects: Array<{ id: string; name: string }>;
  onDateRangeSelect: (range: 'this-month' | 'last-month' | 'custom') => void;
  tempStartDate?: Date;
  tempEndDate?: Date;
  onTempDateChange?: (range: { from?: Date; to?: Date }) => void;
  onConfirmDateRange?: () => void;
  onResetDateRange?: () => void;
  isDatePickerOpen?: boolean;
  onDatePickerOpenChange?: (open: boolean) => void;
  dateRangeOption?: 'this-month' | 'last-month' | 'custom';
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  projects,
  onDateRangeSelect,
  tempStartDate,
  tempEndDate,
  onTempDateChange,
  onConfirmDateRange,
  onResetDateRange,
  isDatePickerOpen,
  onDatePickerOpenChange,
  dateRangeOption = 'this-month',
}) => {
  const handleProjectChange = (projectId: string) => {
    onFiltersChange({
      ...filters,
      projectId: projectId === 'all' ? 'all' : projectId,
    });
  };

  const handleBillableTypeChange = (type: string) => {
    onFiltersChange({
      ...filters,
      billableType: type as 'all' | 'billable' | 'non-billable',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Selector */}
      <Select
        value={dateRangeOption}
        onValueChange={onDateRangeSelect}
      >
        <SelectTrigger className="w-[140px] bg-pink-50 border-pink-200">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range Picker - Show button when custom is selected */}
      {dateRangeOption === 'custom' && (
        <Popover open={isDatePickerOpen} onOpenChange={onDatePickerOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[240px] justify-start text-left font-normal bg-pink-50 border-pink-200',
                !tempStartDate && 'text-muted-foreground'
              )}
              onClick={() => {
                if (!isDatePickerOpen) {
                  onDatePickerOpenChange?.(true);
                }
              }}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {tempStartDate && tempEndDate ? (
                `${format(tempStartDate, 'MMM dd, yyyy')} - ${format(tempEndDate, 'MMM dd, yyyy')}`
              ) : filters.startDate && filters.endDate ? (
                `${format(filters.startDate, 'MMM dd, yyyy')} - ${format(filters.endDate, 'MMM dd, yyyy')}`
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempStartDate || new Date()}
              selected={{
                from: tempStartDate,
                to: tempEndDate,
              }}
              onSelect={(range) => {
                onTempDateChange?.({
                  from: range?.from,
                  to: range?.to,
                });
              }}
              numberOfMonths={2}
            />
            <div className="flex justify-end gap-2 p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onResetDateRange?.();
                  onDatePickerOpenChange?.(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onConfirmDateRange?.();
                  onDatePickerOpenChange?.(false);
                }}
                disabled={!tempStartDate || !tempEndDate}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Project Filter */}
      <Select value={filters.projectId || 'all'} onValueChange={handleProjectChange}>
        <SelectTrigger className="w-[140px] bg-pink-50 border-pink-200">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Billable Type Filter */}
      <Select
        value={filters.billableType || 'all'}
        onValueChange={handleBillableTypeChange}
      >
        <SelectTrigger className="w-[140px] bg-pink-50 border-pink-200">
          <SelectValue placeholder="Billable type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="billable">Billable</SelectItem>
          <SelectItem value="non-billable">Non-Billable</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

