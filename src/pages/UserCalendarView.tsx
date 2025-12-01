import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { format, parse, startOfMonth, addMonths, subMonths, getDaysInMonth } from 'date-fns';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAllUsers, useUserMonthlyActivity } from '@/features/admin/hooks/useAdminUserManagement';
import { UserLeave, UserWorklogEntry } from '@/features/admin/services/adminUserManagementService';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

const parseMonth = (value: string | null) => {
  if (!value) return startOfMonth(new Date());
  return startOfMonth(parse(`${value}-01`, 'yyyy-MM-dd', new Date()));
};

const buildCalendarDays = (month: Date) => {
  const firstDay = startOfMonth(month).getDay();
  const daysInMonth = getDaysInMonth(month);
  const cells: Array<Date | null> = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const leaveWeight = (leave: UserLeave) => (leave.leave_type === 'half' ? 0.5 : 1);

const SummaryCard: React.FC<{ title: string; value: string; icon?: React.ReactNode }> = ({
  title,
  value,
  icon,
}) => (
  <Card className="rounded-[14px] border-[#E7E7E7] bg-white dark:bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

interface DayCellProps {
  date: Date | null;
  leaves: UserLeave[];
  worklogs: UserWorklogEntry[];
  onSelect: (date: Date) => void;
}

const DayCell: React.FC<DayCellProps> = ({ date, leaves, worklogs, onSelect }) => {
  if (!date) return <div className="h-28 rounded-[14px] bg-muted/30" />;

  const workHours = worklogs.reduce((acc, log) => acc + (log.hours_num || 0), 0);
  const leaveSummary = leaves.map((leave) => ({
    label: leave.leave_type === 'half' ? 'Half' : 'Full',
    color: leave.is_paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
    key: leave.id,
  }));

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={cn(
        'h-28 rounded-[14px] border border-[#E7E7E7] bg-white p-3 text-left transition-all hover:border-primary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary',
        leaves.length > 0 && 'border-primary/40'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{format(date, 'd')}</span>
        {workHours > 0 && (
          <span className="text-xs font-medium text-primary">{workHours.toFixed(1)}h</span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {leaveSummary.map((leave) => (
          <span
            key={leave.key}
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              leave.color
            )}
          >
            {leave.label} Leave
          </span>
        ))}
        {worklogs.slice(0, 2).map((log) => (
          <div key={log.id} className="text-xs text-muted-foreground truncate">
            {log.project?.name || log.task?.name || 'Worklog'} - {log.hours_num.toFixed(1)}h
          </div>
        ))}
        {worklogs.length > 2 && (
          <div className="text-[11px] text-muted-foreground">+{worklogs.length - 2} more</div>
        )}
      </div>
    </button>
  );
};

const UserCalendarView: React.FC = () => {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const query = new URLSearchParams(location.search);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => parseMonth(query.get('month')));
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(routeUserId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: users = [], isLoading: loadingUsers } = useAllUsers();

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  const { data: activity, isLoading } = useUserMonthlyActivity(
    selectedUserId ?? null,
    currentMonth
  );

  const leavesMap = useMemo(() => {
    const map = new Map<string, UserLeave[]>();
    (activity?.leaves || []).forEach((leave) => {
      const entries = map.get(leave.leave_date) || [];
      entries.push(leave);
      map.set(leave.leave_date, entries);
    });
    return map;
  }, [activity?.leaves]);

  const worklogMap = useMemo(() => {
    const map = new Map<string, UserWorklogEntry[]>();
    (activity?.worklogs || []).forEach((log) => {
      const key = dayKey(new Date(log.created_at));
      const entries = map.get(key) || [];
      entries.push(log);
      map.set(key, entries);
    });
    return map;
  }, [activity?.worklogs]);

  const totalLeaveDays = useMemo(
    () => (activity?.leaves || []).reduce((acc, leave) => acc + leaveWeight(leave), 0),
    [activity?.leaves]
  );

  const totalHours = useMemo(
    () => (activity?.worklogs || []).reduce((acc, log) => acc + (log.hours_num || 0), 0),
    [activity?.worklogs]
  );

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const selectedKey = selectedDate ? dayKey(selectedDate) : null;
  const selectedLeaves = selectedKey ? leavesMap.get(selectedKey) || [] : [];
  const selectedLogs = selectedKey ? worklogMap.get(selectedKey) || [] : [];

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => (direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)));
    setSelectedDate(null);
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" className="rounded-[14px]" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Users
                </Button>
                <div>
                  {/* <p className="text-sm text-muted-foreground">User Calendar</p> */}
                  <h1 className="text-2xl font-bold">
                    {users.find((u) => u.id === selectedUserId)?.name || 'Select a user'}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={loadingUsers || users.length === 0}
                >
                  <SelectTrigger className="w-[220px] rounded-[14px]">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[14px] max-h-64">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SummaryCard
                title="Total Logged Hours"
                value={`${totalHours.toFixed(1)}h`}
                icon={<Clock className="h-5 w-5 text-primary" />}
              />
              <SummaryCard
                title="Total Leave Days"
                value={`${totalLeaveDays.toFixed(1)} d`}
                icon={<CalendarIcon className="h-5 w-5 text-primary" />}
              />
            </div>

            <div className="rounded-[14px] border border-[#E7E7E7] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary" />
                    Worklogs
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-200" />
                    Paid Leave
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-200" />
                    Unpaid Leave
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-[14px] border border-[#E7E7E7] bg-white px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => handleMonthChange('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => handleMonthChange('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="p-10 text-center text-muted-foreground">Loading calendar...</div>
              ) : (
                <div className="grid grid-cols-7 gap-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                    <div key={weekday} className="text-center text-xs font-semibold text-muted-foreground">
                      {weekday}
                    </div>
                  ))}
                  {calendarDays.map((date, idx) => (
                    <DayCell
                      key={idx}
                      date={date}
                      leaves={date ? leavesMap.get(dayKey(date)) || [] : []}
                      worklogs={date ? worklogMap.get(dayKey(date)) || [] : []}
                      onSelect={(selected) => setSelectedDate(selected)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={!!selectedDate}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-[14px]">
          <DialogHeader>
            <DialogTitle>{selectedDate ? format(selectedDate, 'PPP') : 'Day Details'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Leaves</h3>
              {selectedLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave recorded.</p>
              ) : (
                <div className="space-y-2">
                  {selectedLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className={cn(
                        'rounded-[12px] border px-3 py-2 text-sm',
                        leave.is_paid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      )}
                    >
                      <div className="font-medium capitalize">{leave.leave_type} day</div>
                      <div className="text-xs text-muted-foreground">
                        {leave.is_paid ? 'Paid' : 'Unpaid'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Worklogs</h3>
              {selectedLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No worklogs recorded.</p>
              ) : (
                <div className="space-y-2">
                  {selectedLogs.map((log) => (
                    <div key={log.id} className="rounded-[12px] border border-[#E7E7E7] p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {log.project?.name || log.task?.name || 'Worklog'}
                        </span>
                        <span className="text-primary font-semibold">{log.hours_num.toFixed(1)}h</span>
                      </div>
                      {log.note && (
                        <p className="mt-1 text-xs text-muted-foreground">{log.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UserCalendarView;

