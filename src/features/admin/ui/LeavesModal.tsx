import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserLeave } from '../services/adminUserManagementService';
import { toast } from 'sonner';

interface LeavesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userId: string;
  monthDate: Date;
  leaves: UserLeave[];
  onAddLeave: (data: { leave_date: string; is_paid: boolean; leave_type: 'full' | 'half' }) => Promise<void>;
  onDeleteLeave: (leaveId: string) => Promise<void>;
  isAdding: boolean;
  isDeleting: boolean;
}

export const LeavesModal: React.FC<LeavesModalProps> = ({
  open,
  onOpenChange,
  userName,
  userId,
  monthDate,
  leaves,
  onAddLeave,
  onDeleteLeave,
  isAdding,
  isDeleting,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isPaid, setIsPaid] = useState(false);
  const [leaveType, setLeaveType] = useState<'full' | 'half'>('full');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleAddLeave = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    // Check if leave already exists for this date
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingLeave = leaves.find((l) => l.leave_date === dateStr);
    if (existingLeave) {
      toast.error('Leave already exists for this date');
      return;
    }

    try {
      await onAddLeave({
        leave_date: dateStr,
        is_paid: isPaid,
        leave_type: leaveType,
      });
      setSelectedDate(undefined);
      setIsPaid(false);
      setLeaveType('full');
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        toast.error('Leave already exists for this date');
      } else {
        toast.error(error?.message || 'Failed to add leave');
      }
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm('Are you sure you want to delete this leave?')) {
      return;
    }

    try {
      await onDeleteLeave(leaveId);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete leave');
    }
  };

  // Get month range for date picker
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Leaves - {userName}</DialogTitle>
          <DialogDescription>
            Manage leaves for {format(monthDate, 'MMMM yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add Leave Form */}
          <div className="border rounded-[14px] p-4 space-y-4">
            <h3 className="font-semibold">Add Leave</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Date</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal rounded-[14px]',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-[14px]" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setIsDatePickerOpen(false);
                      }}
                      disabled={(date) => date < monthStart || date > monthEnd}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="isPaid"
                  checked={isPaid}
                  onCheckedChange={(checked) => setIsPaid(checked === true)}
                />
                <Label htmlFor="isPaid" className="cursor-pointer">
                  Paid Leave
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select value={leaveType} onValueChange={(value) => setLeaveType(value as 'full' | 'half')}>
                  <SelectTrigger id="leaveType" className="rounded-[14px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[14px]">
                    <SelectItem value="full">Full Day</SelectItem>
                    <SelectItem value="half">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAddLeave}
              disabled={!selectedDate || isAdding}
              className="w-full bg-primary text-white hover:bg-primary/90 rounded-[14px]"
            >
              {isAdding ? 'Adding...' : 'Add Leave'}
            </Button>
          </div>

          {/* Leaves Table */}
          <div className="border rounded-[14px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Paid?</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No leaves recorded for this month
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{format(new Date(leave.leave_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="capitalize">{leave.leave_type || 'full'}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            leave.is_paid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          )}
                        >
                          {leave.is_paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLeave(leave.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-[14px]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

