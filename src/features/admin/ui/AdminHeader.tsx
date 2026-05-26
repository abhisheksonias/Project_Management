import React from 'react';
import { Download, LogOut, Filter, Calendar as CalendarIcon, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { AdminFilters, DateRangeOption } from '../services/adminService';
import { useAdminProjectsForFilter } from '../hooks/useAdminProjects';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserMentions } from '@/features/projects/hooks/useUserMentions';
import { Mention } from '@/features/projects/services/mentionService';
import { useUpdateCommentAcknowledgment } from '@/features/dashboard/hooks/useProjectMutations';
import { useUpdateTaskCommentAcknowledgment } from '@/features/tasks/hooks/useTaskComments';
import { HtmlContent } from '@/shared/ui/HtmlContent';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminHeaderProps {
  filters: AdminFilters;
  onFiltersChange: (filters: AdminFilters) => void;
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
  tempStartDate: Date | undefined;
  tempEndDate: Date | undefined;
  onTempDateChange: (range: { from?: Date; to?: Date }) => void;
  onConfirmDateRange: () => void;
  onResetDateRange: () => void;
  isDatePickerOpen: boolean;
  onDatePickerOpenChange: (open: boolean) => void;
}

const dateRangeLabels: Record<DateRangeOption, string> = {
  'today': 'Today',
  'this-week': 'This Week',
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'last-30-days': 'Last 30 Days',
  'this-quarter': 'This Quarter',
  'this-year': 'This Year',
  'custom': 'Custom Range',
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  filters,
  onFiltersChange,
  dateRange,
  onDateRangeChange,
  tempStartDate,
  tempEndDate,
  onTempDateChange,
  onConfirmDateRange,
  onResetDateRange,
  isDatePickerOpen,
  onDatePickerOpenChange,
}) => {
  const { data: projects = [], isLoading: projectsLoading } = useAdminProjectsForFilter();
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const currentMonth = new Date();
  const { data: mentions = [], isLoading: mentionsLoading } = useUserMentions(profile?.id || '');
  const updateProjectAcknowledgmentMutation = useUpdateCommentAcknowledgment();
  const updateTaskAcknowledgmentMutation = useUpdateTaskCommentAcknowledgment();
  const isMobile = useIsMobile();
  
  // Filter unacknowledged mentions
  const unacknowledgedMentions = mentions.filter(m => !m.acknowledged);

  const sortedProjects = React.useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleProjectChange = (value: string) => {
    onFiltersChange({
      ...filters,
      projectId: value === 'all' ? null : value,
    });
  };

  const handleDepartmentChange = (value: string) => {
    onFiltersChange({
      ...filters,
      department: value === 'all' ? null : value,
    });
  };

  // Count active filters
  const activeFiltersCount = [
    filters.projectId ? 1 : 0,
    filters.department ? 1 : 0,
    dateRange !== 'this-month' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getDateRangeLabel = () => {
    if (dateRange === 'custom' && tempStartDate && tempEndDate) {
      return `${format(tempStartDate, 'MMM d')} - ${format(tempEndDate, 'MMM d')}`;
    }
    return dateRangeLabels[dateRange] || 'This Month';
  };

  const selectedProject = sortedProjects.find(p => p.id === filters.projectId);
  const departmentLabel = filters.department 
    ? filters.department.charAt(0).toUpperCase() + filters.department.slice(1)
    : 'All Departments';

  return (
    <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
              Admin Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
              Your Agency Performance Overview
            </p>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="relative rounded-[14px] border-secondary hover:bg-secondary h-9 sm:h-10 w-9 sm:w-10 p-0"
                >
                  <Bell className="h-4 w-4" />
                  {unacknowledgedMentions.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                      {unacknowledgedMentions.length > 9 ? '9+' : unacknowledgedMentions.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[90vw] sm:w-80 md:w-96 rounded-[14px] p-0">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {unacknowledgedMentions.length === 0 
                      ? 'No new mentions' 
                      : `${unacknowledgedMentions.length} unread mention${unacknowledgedMentions.length > 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {mentionsLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : unacknowledgedMentions.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">No new mentions</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {unacknowledgedMentions.map((mention) => (
                        <MentionItem
                          key={mention.id}
                          mention={mention}
                          onAcknowledge={() => {
                            if (!profile) return;
                            if (mention.type === 'project') {
                              updateProjectAcknowledgmentMutation.mutate({
                                projectId: mention.projectId,
                                commentId: mention.commentId,
                                acknowledged: true,
                                acknowledgedBy: profile.id,
                              });
                            } else if (mention.type === 'task') {
                              updateTaskAcknowledgmentMutation.mutate({
                                taskId: mention.taskId,
                                commentId: mention.commentId,
                                acknowledged: true,
                                acknowledgedBy: profile.id,
                              });
                            }
                          }}
                          onView={() => {
                            if (mention.type === 'project') {
                              navigate('/admin/projects');
                            } else if (mention.type === 'task') {
                              navigate('/admin/tasks');
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Filters Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-initial rounded-[14px] border-secondary hover:bg-secondary h-9 sm:h-10"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[90vw] sm:w-64 md:w-80 rounded-[14px] max-h-[80vh] overflow-y-auto">
                <DropdownMenuLabel>Date Range</DropdownMenuLabel>
                <div className="px-2 py-1.5 space-y-1">
                  {(['today', 'this-week', 'this-month', 'last-month', 'last-30-days', 'this-quarter', 'this-year'] as DateRangeOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => onDateRangeChange(option)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 text-sm rounded-[12px] transition-colors',
                        dateRange === option
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-secondary text-foreground'
                      )}
                    >
                      {dateRangeLabels[option]}
                    </button>
                  ))}
                </div>
                <Popover open={isDatePickerOpen} onOpenChange={onDatePickerOpenChange}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => {
                        onDateRangeChange('custom');
                        onDatePickerOpenChange(true);
                      }}
                      className={cn(
                        'w-full text-left px-2 py-1.5 text-sm rounded-[12px] transition-colors flex items-center gap-2',
                        dateRange === 'custom'
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-secondary text-foreground'
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      Custom Range
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-[14px]" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={currentMonth}
                      selected={{
                        from: tempStartDate,
                        to: tempEndDate,
                      }}
                      onSelect={(range) => {
                        if (range?.from === undefined && range?.to === undefined) {
                          onTempDateChange({ from: undefined, to: undefined });
                        } else {
                          onTempDateChange({ from: range?.from, to: range?.to });
                        }
                      }}
                      numberOfMonths={isMobile ? 1 : 2}
                    />
                    {(tempStartDate || tempEndDate) && (
                      <div className="border-t p-3 flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-[14px]"
                          onClick={onResetDateRange}
                        >
                          Reset
                        </Button>
                        <Button
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
                          onClick={onConfirmDateRange}
                          disabled={!tempStartDate || !tempEndDate}
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <DropdownMenuSeparator />

                    <DropdownMenuLabel className="text-sm font-semibold">Project</DropdownMenuLabel>
                <div className="px-2 py-1.5">
                  <Select
                    value={filters.projectId || 'all'}
                    onValueChange={handleProjectChange}
                    disabled={projectsLoading}
                  >
                    <SelectTrigger className="w-full bg-secondary border-secondary rounded-[14px] h-9">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[14px]">
                      <SelectItem value="all">All Projects</SelectItem>
                      {sortedProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DropdownMenuSeparator />

                    <DropdownMenuLabel className="text-sm font-semibold">Department</DropdownMenuLabel>
                <div className="px-2 py-1.5">
                  <Select
                    value={filters.department || 'all'}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger className="w-full bg-secondary border-secondary rounded-[14px] h-9">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[14px]">
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Filters Summary */}
                {activeFiltersCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Active Filters</div>
                      <div className="flex flex-wrap gap-2">
                        {dateRange !== 'this-month' && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-[10px]">
                            {getDateRangeLabel()}
                            <button
                              onClick={() => onDateRangeChange('this-month')}
                              className="hover:bg-primary/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {filters.projectId && selectedProject && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-[10px]">
                            {selectedProject.name}
                            <button
                              onClick={() => handleProjectChange('all')}
                              className="hover:bg-primary/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {filters.department && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-[10px]">
                            {departmentLabel}
                            <button
                              onClick={() => handleDepartmentChange('all')}
                              className="hover:bg-primary/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Button */}
            {/* <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px] h-9 sm:h-10 px-3 sm:px-4"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button> */}

            {/* Logout Button */}
            {/* <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-[14px] border-secondary hover:bg-secondary h-9 sm:h-10 px-3 sm:px-4"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button> */}
          </div>
        </div>

        {/* Active Filters Bar - Mobile View */}
        {activeFiltersCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border sm:hidden">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground font-medium">Active:</span>
              {dateRange !== 'this-month' && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">
                  {getDateRangeLabel()}
                </span>
              )}
              {filters.projectId && selectedProject && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">
                  {selectedProject.name}
                </span>
              )}
              {filters.department && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">
                  {departmentLabel}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface MentionItemProps {
  mention: Mention;
  onAcknowledge: () => void;
  onView: () => void;
}

const MentionItem: React.FC<MentionItemProps> = ({ mention, onAcknowledge, onView }) => {
  return (
    <div
      className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              mention.type === 'project' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            }`}>
              {mention.projectName}
            </span>
            {/* <span className="text-xs font-semibold  text-foreground">
              {mention.projectName}
            </span> */}
            <span className="text-xs font-semibold text-foreground">
              {mention.user_name}
            </span>
            {/* <span className="text-xs text-muted-foreground">mentioned you in</span> */}
          </div>
          <div className="text-xs font-medium text-primary mb-1">
            {mention.type === 'project' ? ' ' : mention.taskName}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
            <HtmlContent content={mention.message} className="text-xs" />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {format(new Date(mention.created_at), 'MMM dd, HH:mm')}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAcknowledge();
          }}
          className="h-7 w-7 p-0 rounded-full"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};