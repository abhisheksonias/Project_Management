import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { AdminWorklog } from '../services/adminWorklogService';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Calendar, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { normalizeHoursToHHMM } from '@/shared/utils/formatHours';
import { AdminEditWorklogDialog } from './AdminEditWorklogDialog';
import { useDeleteWorklog } from '../hooks/useAdminWorklogs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Project } from '@/features/projects/services/projectService';
import { User as UserType } from '@/features/users/services/userService';

interface RecentWorklogsTableProps {
  worklogs: AdminWorklog[];
  isLoading: boolean;
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
  projects?: Project[];
  users?: UserType[];
}

const formatHours = (hours: string) => {
  if (!hours) return '00:00';
  // Normalize to HH:MM format
  return normalizeHoursToHHMM(hours);
};

export const RecentWorklogsTable: React.FC<RecentWorklogsTableProps> = ({
  worklogs,
  isLoading,
  onDateRangeChange,
  projects = [],
  users = [],
}) => {
  const defaultStartDate = subDays(new Date(), 7);
  const defaultEndDate = new Date();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultStartDate,
    to: defaultEndDate,
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedWorklog, setSelectedWorklog] = useState<AdminWorklog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingWorklogId, setDeletingWorklogId] = useState<string | null>(null);
  const [clickedRowId, setClickedRowId] = useState<string | null>(null);
  const deleteWorklogMutation = useDeleteWorklog();

  // Initialize with default date range on mount (only if callback is provided)
  useEffect(() => {
    if (onDateRangeChange && dateRange?.from && dateRange?.to) {
      onDateRangeChange(startOfDay(dateRange.from), endOfDay(dateRange.to));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleApplyDateRange = () => {
    if (dateRange?.from && dateRange?.to) {
      onDateRangeChange?.(startOfDay(dateRange.from), endOfDay(dateRange.to));
      setIsDatePickerOpen(false);
    }
  };

  const handleResetDateRange = () => {
    const defaultRange = {
      from: defaultStartDate,
      to: defaultEndDate,
    };
    setDateRange(defaultRange);
    onDateRangeChange?.(startOfDay(defaultRange.from), endOfDay(defaultRange.to));
    setIsDatePickerOpen(false);
  };

  const getDateRangeLabel = () => {
    if (!dateRange?.from) {
      return 'Select date range';
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    return format(dateRange.from, 'dd/MM/yyyy');
  };

  if (isLoading) {
    return (
      <Card className="p-6 rounded-[14px] bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Worklogs</h3>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-[14px]" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-[14px] bg-white flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Recent Worklogs</h3>
        <div className="flex items-center gap-2">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'rounded-[14px] border-secondary bg-white hover:bg-secondary',
                  'justify-start text-left font-normal h-9'
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {getDateRangeLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-[14px]" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
              />
              <div className="border-t p-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-[14px]"
                  onClick={handleResetDateRange}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-[14px] bg-primary text-white hover:bg-primary/90"
                  onClick={handleApplyDateRange}
                  disabled={!dateRange?.from || !dateRange?.to}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">
            Showing {worklogs.length} {worklogs.length === 1 ? 'log' : 'logs'}
          </span>
        </div>
      </div>
      {worklogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>
            {dateRange?.from && dateRange?.to
              ? `No worklogs found for the selected date range`
              : 'No worklogs found in the last 7 days'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full">
            <thead className="bg-secondary sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-l-[14px]">
                  User
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Project
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Task Name
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Task Description
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-r-[14px]">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {worklogs.map((log) => (
                <Popover key={log.id} open={clickedRowId === log.id} onOpenChange={(open) => {
                  if (!open) setClickedRowId(null);
                }}>
                  <PopoverTrigger asChild>
                    <tr
                      className={cn(
                        "border-b border-secondary/30 hover:bg-secondary/30 transition-colors cursor-pointer",
                        clickedRowId === log.id && "bg-secondary/50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedRowId(log.id);
                      }}
                    >
                  <td className="p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{log.user?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{log.project?.name || '—'}</td>
                  <td className="p-3 text-sm">{log.task?.name || '—'}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {format(new Date(log.created_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="p-3 text-sm max-w-xs">
                    {log.note ? (
                      <span className="line-clamp-2">{log.note}</span>
                    ) : (
                      <span className="text-muted-foreground">{log.task?.name || '—'}</span>
                    )}
                  </td>
                  <td className="p-3 text-sm font-semibold text-primary">
                    {formatHours(log.hours)}
                  </td>
                    </tr>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-48 p-1 rounded-[14px]"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-[14px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorklog(log);
                          setIsEditDialogOpen(true);
                          setClickedRowId(null);
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-[14px] text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingWorklogId(log.id);
                          setClickedRowId(null);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <AdminEditWorklogDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        worklog={selectedWorklog}
        projects={projects}
        users={users}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          setSelectedWorklog(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingWorklogId}
        onOpenChange={(open) => {
          if (!open) setDeletingWorklogId(null);
        }}
      >
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worklog</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this worklog? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[14px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingWorklogId) {
                  deleteWorklogMutation.mutate(deletingWorklogId, {
                    onSuccess: () => {
                      setDeletingWorklogId(null);
                    },
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700 rounded-[14px]"
              disabled={deleteWorklogMutation.isPending}
            >
              {deleteWorklogMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

