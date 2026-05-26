import React, { useState } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { UsersWithNoLogsCard } from '@/features/admin/ui/UsersWithNoLogsCard';
import { TodaysWorklogsTable } from '@/features/admin/ui/TodaysWorklogsTable';
import { RecentWorklogsTable } from '@/features/admin/ui/RecentWorklogsTable';
import { AdminAddWorklogDialog } from '@/features/admin/ui/AdminAddWorklogDialog';
import {
  useTodaysWorklogs,
  useRecentWorklogs,
  useUsersWithNoLogs,
  useWorklogsByDateRange,
} from '@/features/admin/hooks/useAdminWorklogs';
import { useAdminProjects } from '@/features/admin/hooks/useAdminProjects';
import { userService } from '@/features/users/services/userService';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar, Plus, Folder, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const AdminWorklogs: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAddWorklogDialogOpen, setIsAddWorklogDialogOpen] = useState(false);
  const [selectedUserIdForDialog, setSelectedUserIdForDialog] = useState<string | undefined>();
  const [recentWorklogsStartDate, setRecentWorklogsStartDate] = useState<Date | null>(null);
  const [recentWorklogsEndDate, setRecentWorklogsEndDate] = useState<Date | null>(null);

  // Fetch data
  const { data: todaysWorklogs = [], isLoading: isLoadingTodays } = useTodaysWorklogs(
    selectedDate,
    selectedProjectId,
    selectedUserId
  );
  // Use custom date range if provided, otherwise use default 7 days
  const { data: recentWorklogsByRange = [], isLoading: isLoadingRecentByRange } = useWorklogsByDateRange(
    recentWorklogsStartDate,
    recentWorklogsEndDate,
    selectedProjectId,
    selectedUserId
  );
  const { data: recentWorklogsDefault = [], isLoading: isLoadingRecentDefault } = useRecentWorklogs(
    7,
    selectedProjectId,
    selectedUserId
  );

  // Use custom range if dates are set, otherwise use default 7 days
  const recentWorklogs = recentWorklogsStartDate && recentWorklogsEndDate 
    ? recentWorklogsByRange 
    : recentWorklogsDefault;
  const isLoadingRecent = recentWorklogsStartDate && recentWorklogsEndDate 
    ? isLoadingRecentByRange 
    : isLoadingRecentDefault;
  const { data: usersWithNoLogs = [], isLoading: isLoadingUsers } = useUsersWithNoLogs(selectedDate);
  const { data: projects = [] } = useAdminProjects();
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userService.getAllUsers(),
    staleTime: 300000,
  });

  // Filter out admin users
  const users = allUsers.filter((user) => user.role !== 'Admin');

  const handleAddWorklog = (userId?: string) => {
    setSelectedUserIdForDialog(userId);
    setIsAddWorklogDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    // Data will be automatically refetched due to query invalidation
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
              {/* Header Section */}
              <header className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Worklog Management</h1>
                  <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base">
                    Monitor daily time entries and add logs on behalf of team members.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-end w-full sm:w-auto">
                  {/* Date Picker */}
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'rounded-[14px] border-secondary bg-white hover:bg-secondary text-sm h-9 sm:h-10',
                          'w-full sm:w-auto justify-start text-left font-normal'
                        )}
                      >
                        <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        {format(selectedDate, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[14px]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setIsDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Project Filter */}
                  <Select
                    value={selectedProjectId || 'all'}
                    onValueChange={(value) => setSelectedProjectId(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="rounded-[14px] border-secondary bg-white w-full sm:w-[180px] text-sm h-9 sm:h-10">
                      <Folder className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[14px]">
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* User Filter */}
                  <Select
                    value={selectedUserId || 'all'}
                    onValueChange={(value) => setSelectedUserId(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="rounded-[14px] border-secondary bg-white w-full sm:w-[180px] text-sm h-9 sm:h-10">
                      <UserIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[14px]">
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Add Worklog Button */}
                  <Button
                    onClick={() => handleAddWorklog()}
                    className="rounded-[14px] bg-primary text-white hover:bg-primary/90 w-full sm:w-auto text-sm h-9 sm:h-10"
                  >
                    <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Add Worklog</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>
              </header>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 min-h-0">
                {/* Left: Users with No Logs */}
                <div className="lg:col-span-1 min-h-0">
                  <UsersWithNoLogsCard
                    users={usersWithNoLogs}
                    isLoading={isLoadingUsers}
                    onAddWorklog={(userId) => handleAddWorklog(userId)}
                  />
                </div>

                {/* Right: Today's Worklogs */}
                <div className="lg:col-span-1 min-h-0">
                  <TodaysWorklogsTable
                    worklogs={todaysWorklogs}
                    isLoading={isLoadingTodays}
                    projects={projects}
                    users={users}
                  />
                </div>
              </div>

              {/* Bottom: Recent Worklogs */}
              <div className="w-full min-h-0">
                <RecentWorklogsTable
                  worklogs={recentWorklogs}
                  isLoading={isLoadingRecent}
                  onDateRangeChange={(startDate, endDate) => {
                    setRecentWorklogsStartDate(startDate);
                    setRecentWorklogsEndDate(endDate);
                  }}
                  projects={projects}
                  users={users}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Worklog Dialog */}
      <AdminAddWorklogDialog
        open={isAddWorklogDialogOpen}
        onOpenChange={setIsAddWorklogDialogOpen}
        selectedDate={selectedDate}
        selectedUserId={selectedUserIdForDialog}
        projects={projects}
        users={users}
        onSuccess={handleDialogSuccess}
      />
    </AdminLayout>
  );
};

export default AdminWorklogs;
