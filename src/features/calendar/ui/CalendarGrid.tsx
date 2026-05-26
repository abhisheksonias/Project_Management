import React from 'react';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  calendarDays: Date[];
  currentMonth: Date;
  worklogsByDate: Map<string, { billable: number; nonBillable: number }>;
  leavesByDate?: Map<string, { is_paid: boolean; leave_type: 'full' | 'half' }>;
  onDateClick: (date: Date) => void;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarDays,
  currentMonth,
  worklogsByDate,
  leavesByDate = new Map(),
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

  const getLeaveForDate = (date: Date) => {
    const dateStr = formatLocalYMD(date);
    return leavesByDate.get(dateStr);
  };

  return (
    <Card>
      <div className="p-2 sm:p-3 md:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold text-[10px] sm:text-xs md:text-sm text-muted-foreground p-1 sm:p-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((date, index) => {
            const hoursData = getHoursForDate(date);
            const leave = getLeaveForDate(date);
            const today = isToday(date);
            const isCurrent = isCurrentMonth(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={index}
                onClick={() => onDateClick(date)}
                className={cn(
                  'min-h-[60px] sm:min-h-[70px] md:min-h-[80px] border rounded-lg p-1 sm:p-1.5 md:p-2 transition-colors cursor-pointer',
                  today && 'border-primary border-2',
                  !isCurrent && 'opacity-40',
                  !today && !leave && 'hover:bg-gray-50',
                  isWeekend && !today && !leave && 'bg-muted/30',
                  leave && !leave.is_paid && leave.leave_type === 'full' && 'bg-red-50 border-red-400 hover:bg-red-100',
                  leave && !leave.is_paid && leave.leave_type === 'half' && 'bg-orange-50 border-orange-400 hover:bg-orange-100',
                  leave && leave.is_paid && 'bg-green-50 border-green-400 hover:bg-green-100'
                )}
              >
                <div className="flex items-start justify-between mb-1 sm:mb-2">
                  <span className={cn(
                    'text-xs sm:text-sm font-medium',
                    today && 'text-primary font-bold',
                    !today && isWeekend && 'text-muted-foreground',
                    !today && !isWeekend && 'text-foreground'
                  )}>
                    {date.getDate()}
                  </span>
                  {leave && (
                    <span className={cn(
                      'text-[10px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded-full',
                      leave.leave_type === 'half' && 'bg-orange-200 text-orange-800',
                      leave.leave_type === 'full' && leave.is_paid && 'bg-green-200 text-green-800',
                      leave.leave_type === 'full' && !leave.is_paid && 'bg-red-200 text-red-800'
                    )}>
                      {leave.leave_type === 'half' ? '½' : 'L'}
                    </span>
                  )}
                </div>

                {hoursData && (() => {
                  const hasBoth = hoursData.billable > 0 && hoursData.nonBillable > 0;
                  const billablePercentage = (hoursData.billable / hoursData.total) * 100;
                  
                  return (
                    <div className="space-y-0.5 sm:space-y-1">
                      {hasBoth ? (
                        // Combined bar showing both types
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <div className="h-3 sm:h-4 flex-1 rounded-sm overflow-hidden flex">
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
                          <span className="text-[10px] sm:text-xs font-semibold text-primary">
                            {hoursData.total}h
                          </span>
                        </div>
                      ) : (
                        // Single bar for one type
                        hoursData.billable > 0 ? (
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <div className="h-3 sm:h-4 flex-1 bg-primary rounded-sm" />
                            <span className="text-[10px] sm:text-xs font-semibold text-primary">
                              {hoursData.billable}h
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <div className="h-3 sm:h-4 flex-1 bg-gray-400 rounded-sm" />
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-600">
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

