import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { AdminHeader } from '@/features/admin/ui/AdminHeader';
import { KpiRow } from '@/features/admin/ui/KpiRow';
import { DailyHoursCard } from '@/features/admin/ui/DailyHoursCard';
import { TopProjectsCard } from '@/features/admin/ui/TopProjectsCard';
import { AdminFilters, DateRangeOption } from '@/features/admin/services/adminService';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const currentMonth = new Date();
  const [dateRange, setDateRange] = useState<DateRangeOption>('this-month');
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startOfMonth(currentMonth));
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endOfMonth(currentMonth));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [filters, setFilters] = useState<AdminFilters>({
    dateRange: 'this-month',
    projectId: null,
    department: null,
  });

  // Calculate date range based on selection
  useEffect(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'last-30-days':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'this-quarter':
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case 'this-year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'custom':
        // Use temp dates, will be set when confirmed
        if (tempStartDate && tempEndDate) {
          start = tempStartDate;
          end = tempEndDate;
        } else {
          start = startOfMonth(now);
          end = endOfMonth(now);
        }
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    setFilters((prev) => ({
      ...prev,
      dateRange,
      startDate: start,
      endDate: end,
    }));
  }, [dateRange, tempStartDate, tempEndDate]);

  const handleDateRangeChange = (range: DateRangeOption) => {
    setDateRange(range);
    if (range !== 'custom') {
      setIsDatePickerOpen(false);
    }
  };

  const handleConfirmDateRange = () => {
    if (tempStartDate && tempEndDate) {
      setFilters((prev) => ({
        ...prev,
        dateRange: 'custom',
        startDate: tempStartDate,
        endDate: tempEndDate,
      }));
      setIsDatePickerOpen(false);
    }
  };

  const handleResetDateRange = () => {
    setTempStartDate(startOfMonth(currentMonth));
    setTempEndDate(endOfMonth(currentMonth));
  };

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <AdminHeader
          filters={filters}
          onFiltersChange={setFilters}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          tempStartDate={tempStartDate}
          tempEndDate={tempEndDate}
          onTempDateChange={(range) => {
            setTempStartDate(range.from);
            setTempEndDate(range.to);
          }}
          onConfirmDateRange={handleConfirmDateRange}
          onResetDateRange={handleResetDateRange}
          isDatePickerOpen={isDatePickerOpen}
          onDatePickerOpenChange={setIsDatePickerOpen}
        />
        
        <div className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-6 sm:space-y-8">
              <KpiRow filters={filters} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                <DailyHoursCard filters={filters} />
                <TopProjectsCard filters={filters} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;