import React from 'react';
import { Download, LogOut, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
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
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const currentMonth = new Date();

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
                      numberOfMonths={2}
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
