import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PlusCircle, Check, Circle, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { useAuth } from '@/contexts/AuthContext';

interface DayDetailsSheetProps {
  selectedDate: Date | null;
  worklogs: Worklog[];
  onClose: () => void;
  onEdit: (log: Worklog) => void;
  onDelete: (id: string) => void;
  onAddWorklog: () => void;
}

export const DayDetailsSheet: React.FC<DayDetailsSheetProps> = ({
  selectedDate,
  worklogs,
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

  const worklogsForDate = getWorklogsForDate();

  const isBillable = (log: Worklog) => {
    const taskType = log.tasks?.type?.toLowerCase();
    return taskType === 'billable';
  };

  return (
    <Sheet open={!!selectedDate} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {worklogsForDate.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No worklogs for this date</p>
            </div>
          ) : (
            worklogsForDate.map((log) => {
              const billable = isBillable(log);
              
              return (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{log.projects?.name}</p>
                      <p className="text-sm text-muted-foreground">{log.tasks?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {billable ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400 fill-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {log.hours} Hours
                      </span>
                      {billable ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    {!isSales && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(log)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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
          <div className="mt-6 pt-6 border-t">
            <Button
              className="w-full bg-primary text-white hover:bg-primary/90"
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

