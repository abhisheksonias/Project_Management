import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoggedCalendarProps {
  // Expecting an array of date strings in YYYY-MM-DD format based on work_logs.created_at/created_date
  loggedDays: string[];
  onMonthChange: (date: Date) => void;
}

export const LoggedCalendar: React.FC<LoggedCalendarProps> = ({ loggedDays, onMonthChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(year, month + (direction === 'next' ? 1 : -1), 1);
    setCurrentMonth(newMonth);
    onMonthChange(newMonth);
  };

  // Build a Set for O(1) lookups and compare in local YYYY-MM-DD to avoid timezone drift
  const loggedSet = React.useMemo(() => new Set(loggedDays), [loggedDays]);

  const formatLocalYMD = (y: number, m: number, d: number) => {
    // en-CA locale yields YYYY-MM-DD
    return new Date(y, m, d).toLocaleDateString('en-CA');
  };

  const isLoggedDay = (day: number) => loggedSet.has(formatLocalYMD(year, month, day));

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold">{monthNames[month]} {year}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2 sm:pb-3">
        <div className="grid grid-cols-7 gap-0.5">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-0.5 sm:py-1">
              {day}
            </div>
          ))}
          
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="py-0.5 sm:py-1" />
          ))}
          
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const logged = isLoggedDay(day);
            return (
              <div key={day} className="py-0.5 text-center">
                <span
                  className={cn(
                    'inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs',
                    logged ? 'bg-primary text-white' : 'hover:bg-gray-100'
                  )}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Logged Day</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

