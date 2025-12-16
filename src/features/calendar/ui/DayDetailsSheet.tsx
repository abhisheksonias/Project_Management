import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Check, Circle, CheckCircle, XCircle, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { useAuth } from '@/contexts/AuthContext';
import { UserLeave } from '@/features/admin/services/userManagementService';

interface DayDetailsSheetProps {
  selectedDate: Date | null;
  worklogs: Worklog[];
  leaves?: UserLeave[];
  onClose: () => void;
  onEdit: (log: Worklog) => void;
  onDelete: (id: string) => void;
  onAddWorklog: () => void;
}

export const DayDetailsSheet: React.FC<DayDetailsSheetProps> = ({
  selectedDate,
  worklogs,
  leaves = [],
  onClose,
  onEdit,
  onDelete,
  onAddWorklog,
}) => {
  const { profile } = useAuth();
  const isSales = profile?.role === 'Sales';

  const getWorklogsForDate = () => {
    if (!worklogs || !selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return worklogs.filter((log) => log.created_at.split('T')[0] === dateStr);
  };

  const getLeaveForDate = () => {
    if (!leaves || !selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return leaves.find((leave) => leave.leave_date === dateStr) || null;
  };

  const worklogsForDate = getWorklogsForDate();
  const leaveForDate = getLeaveForDate();

  const isBillable = (log: Worklog) => {
    const taskType = log.tasks?.type?.toLowerCase();
    return taskType === 'billable';
  };

  return (
    <Sheet open={!!selectedDate} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base sm:text-lg md:text-xl">
            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
          {/* Leave Information */}
          {leaveForDate && (
            <div className="border rounded-lg p-3 sm:p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-foreground">Leave Information</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Type</span>
                  <Badge className={leaveForDate.leave_type === 'half' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}>
                    {leaveForDate.leave_type === 'half' ? 'Half Day' : 'Full Day'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                  <Badge className={leaveForDate.is_paid ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}>
                    {leaveForDate.is_paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Worklogs */}
          {worklogsForDate.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">
              <p>No worklogs for this date</p>
            </div>
          ) : (
            worklogsForDate.map((log) => {
              const billable = isBillable(log);
              
              return (
                <div key={log.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{log.projects?.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{log.tasks?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {billable ? (
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 fill-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm font-semibold">
                        {log.hours} Hours
                      </span>
                      {billable ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      )}
                    </div>
                    {!isSales && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(log)}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(log.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!isSales && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <Button
              className="w-full bg-primary text-white hover:bg-primary/90 text-sm sm:text-base h-9 sm:h-10"
              onClick={onAddWorklog}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Worklog
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

