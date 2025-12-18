import React, { useState, useEffect, useMemo } from 'react';
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
import { stripHtml } from '@/shared/utils/htmlUtils';
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
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
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

  const groupedWorklogs = useMemo(() => {
    const sortedLogs = [...worklogs].sort((a, b) => {
      const dateDiff =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (dateDiff !== 0) return dateDiff;
      const nameA = (a.user?.name || '').toLowerCase();
      const nameB = (b.user?.name || '').toLowerCase();
      if (nameA && nameB) return nameA.localeCompare(nameB);
      if (nameA) return -1;
      if (nameB) return 1;
      return 0;
    });

    const groups = new Map<
      string,
      { date: Date; label: string; items: AdminWorklog[] }
    >();

    sortedLogs.forEach((log) => {
      const date = startOfDay(new Date(log.created_at));
      const key = format(date, 'yyyy-MM-dd');
      if (!groups.has(key)) {
        groups.set(key, {
          date,
          label: format(date, 'EEEE, dd MMM yyyy'),
          items: [],
        });
      }
      groups.get(key)!.items.push(log);
    });

    return Array.from(groups.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [worklogs]);

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
      <Card className="p-3 sm:p-4 md:p-6 rounded-[14px] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Recent Worklogs</h3>
          <Skeleton className="h-9 sm:h-10 w-full sm:w-40 rounded-[14px]" />
        </div>
        <div className="space-y-2 sm:space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 sm:h-20 rounded-[14px]" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 md:p-6 rounded-[14px] bg-white flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 flex-shrink-0">
        <h3 className="text-base sm:text-lg font-semibold">Recent Worklogs</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'rounded-[14px] border-secondary bg-white hover:bg-secondary',
                  'justify-start text-left font-normal h-9 sm:h-10 text-xs sm:text-sm',
                  'w-full sm:w-auto'
                )}
              >
                <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">{getDateRangeLabel()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-[14px]" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={isMobile ? 1 : 2}
              />
              <div className="border-t p-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-[14px] text-xs sm:text-sm"
                  onClick={handleResetDateRange}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-[14px] bg-primary text-white hover:bg-primary/90 text-xs sm:text-sm"
                  onClick={handleApplyDateRange}
                  disabled={!dateRange?.from || !dateRange?.to}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            Showing {worklogs.length} {worklogs.length === 1 ? 'log' : 'logs'}
          </span>
        </div>
      </div>
      {worklogs.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-muted-foreground">
          <User className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
          <p className="text-xs sm:text-sm px-2">
            {dateRange?.from && dateRange?.to
              ? `No worklogs found for the selected date range`
              : 'No worklogs found in the last 7 days'}
          </p>
        </div>
      ) : isMobile ? (
        <div className="space-y-3 overflow-y-auto max-h-[500px]">
          {groupedWorklogs.map((group) => (
            <React.Fragment key={group.label}>
              <div className="bg-secondary/40 rounded-[14px] p-2">
                <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wide text-center">
                  {group.label}
                </p>
              </div>
              {group.items.map((log) => (
                <Popover
                  key={log.id}
                  open={clickedRowId === log.id}
                  onOpenChange={(open) => {
                    if (!open) setClickedRowId(null);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Card
                      className={cn(
                        'p-3 rounded-[14px] cursor-pointer hover:shadow-md transition-all',
                        clickedRowId === log.id && 'bg-secondary/50 border-primary'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedRowId(log.id);
                      }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{log.user?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.project?.name || '—'}</p>
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-primary shrink-0">
                          {formatHours(log.hours)}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">
                          <span className="font-medium">Task:</span> {log.task?.name || '—'}
                        </p>
                        <p>
                          <span className="font-medium">Date:</span> {format(new Date(log.created_at), 'dd/MM/yyyy')}
                        </p>
                        {log.note && (
                          <p className="line-clamp-2 mt-1">
                            <span className="font-medium">Note:</span> {log.note}
                          </p>
                        )}
                      </div>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[90vw] sm:w-48 p-1 rounded-[14px]"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-[14px] text-xs sm:text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorklog(log);
                          setIsEditDialogOpen(true);
                          setClickedRowId(null);
                        }}
                      >
                        <Edit2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-[14px] text-destructive hover:text-destructive hover:bg-destructive/10 text-xs sm:text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingWorklogId(log.id);
                          setClickedRowId(null);
                        }}
                      >
                        <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full">
            <thead className="bg-secondary sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 font-semibold text-xs sm:text-sm uppercase tracking-wide rounded-l-[14px]">
                  User
                </th>
                <th className="text-left p-3 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                  Project
                </th>
                <th className="text-left p-3 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                  Task Name
                </th>
                <th className="text-left p-3 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left p-3 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                  Task Description
                </th>
                <th className="text-left p-3 font-semibold text-xs sm:text-sm uppercase tracking-wide rounded-r-[14px]">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedWorklogs.map((group) => (
                <React.Fragment key={group.label}>
                  <tr className="bg-secondary/40">
                    <td colSpan={6} className="p-2 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase items-center tracking-wide">
                      <div className="flex items-center justify-center">
                        {group.label}
                      </div>
                    </td>
                  </tr>
                  {group.items.map((log) => (
                    <Popover
                      key={log.id}
                      open={clickedRowId === log.id}
                      onOpenChange={(open) => {
                        if (!open) setClickedRowId(null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <tr
                          className={cn(
                            'border-b border-secondary/30 hover:bg-secondary/30 transition-colors cursor-pointer',
                            clickedRowId === log.id && 'bg-secondary/50'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClickedRowId(log.id);
                          }}
                        >
                          <td className="p-2 sm:p-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                              </div>
                              <span className="font-medium truncate">{log.user?.name || '—'}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm">
                            <span className="truncate block max-w-[120px]">{log.project?.name || '—'}</span>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm">
                            <span className="truncate block max-w-[120px]">{log.task?.name || '—'}</span>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy')}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm max-w-xs">
                            {log.note ? (
                              <span className="line-clamp-2 break-words">{stripHtml(log.note)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-semibold text-primary">
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
                </React.Fragment>
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
        <AlertDialogContent className="rounded-[14px] w-[95vw] sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Worklog</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete this worklog? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-[14px] w-full sm:w-auto text-xs sm:text-sm">Cancel</AlertDialogCancel>
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
              className="bg-red-600 hover:bg-red-700 rounded-[14px] w-full sm:w-auto text-xs sm:text-sm"
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

