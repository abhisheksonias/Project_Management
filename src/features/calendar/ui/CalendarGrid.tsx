import React from 'react';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  calendarDays: Date[];
  currentMonth: Date;
  worklogsByDate: Map<string, { billable: number; nonBillable: number }>;
  onDateClick: (date: Date) => void;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarDays,
  currentMonth,
  worklogsByDate,
  onDateClick,
}) => {
  const month = currentMonth.getMonth();

  const isToday = (date: Date) => {
    const today = new Date();
    return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  const formatLocalYMD = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const getHoursForDate = (date: Date) => {
    const dateStr = formatLocalYMD(date);
    const entry = worklogsByDate.get(dateStr);
    if (!entry) return null;
    
    const total = entry.billable + entry.nonBillable;
    return total > 0 ? { ...entry, total } : null;
  };

  return (
    <Card>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((date, index) => {
            const hoursData = getHoursForDate(date);
            const today = isToday(date);
            const isCurrent = isCurrentMonth(date);

            return (
              <div
                key={index}
                onClick={() => onDateClick(date)}
                className={cn(
                  'min-h-[80px] border rounded-lg p-2 transition-colors cursor-pointer hover:bg-gray-50',
                  today && 'border-primary border-2',
                  !isCurrent && 'opacity-40'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={cn(
                    'text-sm font-medium',
                    today && 'text-primary font-bold'
                  )}>
                    {date.getDate()}
                  </span>
                </div>

                {hoursData && (() => {
                  const hasBoth = hoursData.billable > 0 && hoursData.nonBillable > 0;
                  const billablePercentage = (hoursData.billable / hoursData.total) * 100;
                  
                  return (
                    <div className="space-y-1">
                      {hasBoth ? (
                        // Combined bar showing both types
                        <div className="flex items-center gap-1">
                          <div className="h-4 flex-1 rounded-sm overflow-hidden flex">
                            {hoursData.billable > 0 && (
                              <div 
                                className="bg-primary" 
                                style={{ width: `${billablePercentage}%` }}
                              />
                            )}
                            {hoursData.nonBillable > 0 && (
                              <div 
                                className="bg-gray-400" 
                                style={{ width: `${100 - billablePercentage}%` }}
                              />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-primary">
                            {hoursData.total}h
                          </span>
                        </div>
                      ) : (
                        // Single bar for one type
                        hoursData.billable > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="h-4 flex-1 bg-primary rounded-sm" />
                            <span className="text-xs font-semibold text-primary">
                              {hoursData.billable}h
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="h-4 flex-1 bg-gray-400 rounded-sm" />
                            <span className="text-xs font-semibold text-gray-600">
                              {hoursData.nonBillable}h
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

