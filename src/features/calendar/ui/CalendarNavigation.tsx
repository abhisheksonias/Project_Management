import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarNavigationProps {
  currentMonth: Date;
  viewMode: 'month' | 'week';
  onNavigate: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  onViewModeChange: (mode: 'month' | 'week') => void;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  currentMonth,
  viewMode,
  onNavigate,
  onGoToToday,
  onViewModeChange,
}) => {
  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('prev')} className="h-8 w-8 sm:h-10 sm:w-10">
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="text-base sm:text-lg md:text-xl font-bold min-w-[120px] sm:min-w-[150px] text-center">
            {viewMode === 'month' 
              ? `${monthNames[month]} ${year}` 
              : `Week of ${format(startOfWeek(currentMonth, { weekStartsOn: 0 }), 'MMM d')}`}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onNavigate('next')} className="h-8 w-8 sm:h-10 sm:w-10">
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button variant="outline" onClick={onGoToToday} className="text-xs sm:text-sm h-8 sm:h-10">
            Today
          </Button>
        </div>
      </div>
      <div className="flex gap-1 sm:gap-2">
        <Button
          variant={viewMode === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('month')}
          className={cn(
            'text-xs sm:text-sm h-8 sm:h-9',
            viewMode === 'month' ? 'bg-primary text-white' : ''
          )}
        >
          Month
        </Button>
        <Button
          variant={viewMode === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('week')}
          className={cn(
            'text-xs sm:text-sm h-8 sm:h-9',
            viewMode === 'week' ? 'bg-primary text-white' : ''
          )}
        >
          Week
        </Button>
      </div>
    </div>
  );
};

