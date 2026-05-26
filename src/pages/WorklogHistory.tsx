import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { UserPageLayout } from '@/shared/ui/UserPageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useWorklogHistoryQuery } from '@/features/worklogs/hooks/useWorklogHistoryQuery';
import { useCalendarProjects } from '@/features/calendar/hooks/useCalendarProjects';
import { useCalendarTasks } from '@/features/calendar/hooks/useCalendarTasks';
import { useCreateWorklogHistory, useUpdateWorklogHistory, useDeleteWorklogHistory, useDeleteMultipleWorklogs } from '@/features/worklogs/hooks/useWorklogHistoryMutations';
import { WorklogHistoryHeader } from '@/features/worklogs/ui/WorklogHistoryHeader';
import { DateRangeFilters } from '@/features/worklogs/ui/DateRangeFilters';
import { FilterBar } from '@/features/worklogs/ui/FilterBar';
import { WorklogStatsCards } from '@/features/worklogs/ui/WorklogStatsCards';
import { SelectionActionsBar } from '@/features/worklogs/ui/SelectionActionsBar';
import { WorklogTable } from '@/features/worklogs/ui/WorklogTable';
import { WorklogPagination } from '@/features/worklogs/ui/WorklogPagination';
import { EditWorklogDialogHistory } from '@/features/worklogs/ui/EditWorklogDialogHistory';
import { AddWorklogDialogHistory } from '@/features/worklogs/ui/AddWorklogDialogHistory';
import { exportWorklogsToCSV } from '@/shared/utils/csvExport';
import { filterTasksByUserCategory } from '@/shared/utils/taskFilter';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

const WorklogHistory: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Date range state
  const currentMonth = new Date();
  const [dateRange, setDateRange] = useState<'Today' | 'This Week' | 'This Month' | 'Last Month' | 'Date Range'>('This Month');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(currentMonth));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(currentMonth));
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startOfMonth(currentMonth));
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endOfMonth(currentMonth));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Filter states
  const [selectedProject, setSelectedProject] = useState<string>('All Projects');
  const [selectedTask, setSelectedTask] = useState<string>('All Tasks');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [minHours, setMinHours] = useState<string>('');
  const [maxHours, setMaxHours] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Edit/Delete states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Worklog | null>(null);
  const [editedHours, setEditedHours] = useState<string>('');
  const [editedNote, setEditedNote] = useState<string>('');
  const [editedTaskId, setEditedTaskId] = useState<string>('');
  const [editedDate, setEditedDate] = useState<Date | null>(null);

  // Add Worklog states
  const [isAddLogDialogOpen, setIsAddLogDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [worklogDate, setWorklogDate] = useState<Date | undefined>(new Date());
  const [worklogHours, setWorklogHours] = useState<string>('');
  const [worklogNote, setWorklogNote] = useState<string>('');

  // Role-based access
  const isSales = profile?.role === 'Sales';
  const canEdit = !isSales;

  // Data fetching via hooks (services)
  const { data: worklogs = [], isLoading } = useWorklogHistoryQuery(
    profile?.id || '',
    startDate,
    endDate
  );
  const { data: allProjects = [] } = useCalendarProjects(profile?.id || '');
  const { data: allTasks = [] } = useCalendarTasks();

  // Apply task filtering based on user role/specialization
  const tasks = useMemo(() => {
    return filterTasksByUserCategory(allTasks, profile);
  }, [allTasks, profile]);

  // Mutations via hooks
  const createWorklogMutation = useCreateWorklogHistory();
  const updateWorklogMutation = useUpdateWorklogHistory();
  const deleteWorklogMutation = useDeleteWorklogHistory();
  const deleteMultipleWorklogsMutation = useDeleteMultipleWorklogs();

  // Date range shortcuts
  useEffect(() => {
    const today = new Date();
    switch (dateRange) {
      case 'Today':
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        setStartDate(todayStart);
        setEndDate(todayEnd);
        break;
      case 'This Week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        setStartDate(weekStart);
        setEndDate(weekEnd);
        break;
      case 'This Month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case 'Last Month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
    }
  }, [dateRange]);

  // Filter and paginate worklogs
  const filteredWorklogs = useMemo(() => {
    return worklogs.filter((log: Worklog) => {
      // Project filter
      if (selectedProject !== 'All Projects' && log.projects?.name !== selectedProject) {
        return false;
      }
      
      // Task filter
      if (selectedTask !== 'All Tasks' && log.tasks?.name !== selectedTask) {
        return false;
      }
      
      // Type filter
      if (selectedType !== 'All Types') {
        const logType = log.tasks?.type || '';
        if (selectedType === 'Billable' && logType.toLowerCase() !== 'billable') return false;
        if (selectedType === 'Non-billable' && logType.toLowerCase() !== 'non-billable') return false;
      }
      
      // Hours range filter
      const [hours, minutes] = log.hours.split(':').map(Number);
      const totalHours = hours + minutes / 60;
      if (minHours && totalHours < parseFloat(minHours)) return false;
      if (maxHours && totalHours > parseFloat(maxHours)) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNote = log.note?.toLowerCase().includes(query);
        const matchesProject = log.projects?.name.toLowerCase().includes(query);
        const matchesTask = log.tasks?.name.toLowerCase().includes(query);
        if (!matchesNote && !matchesProject && !matchesTask) return false;
      }
      
      return true;
    });
  }, [worklogs, selectedProject, selectedTask, selectedType, minHours, maxHours, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredWorklogs.length / pageSize);
  const paginatedWorklogs = filteredWorklogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate stats from filtered worklogs (reflects current date range and filters)
  const stats = useMemo(() => {
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    filteredWorklogs.forEach((log: Worklog) => {
      const [hoursStr, minutesStr] = log.hours.split(':');
      const hours = parseInt(hoursStr) + parseInt(minutesStr) / 60;
      totalHours += hours;

      const taskType = log.tasks?.type?.toLowerCase();

      if (taskType === 'billable') {
        billableHours += hours;
      } else {
        nonBillableHours += hours;
      }
    });

    return {
      totalHours: totalHours.toFixed(1),
      billableHours: billableHours.toFixed(1),
      nonBillableHours: nonBillableHours.toFixed(1),
      entries: filteredWorklogs.length,
    };
  }, [filteredWorklogs]);

  // Handlers
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === paginatedWorklogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedWorklogs.map((log: Worklog) => log.id)));
    }
  };

  const resetFilters = () => {
    setSelectedProject('All Projects');
    setSelectedTask('All Tasks');
    setSelectedType('All Types');
    setMinHours('');
    setMaxHours('');
    setSearchQuery('');
    setDateRange('Date Range');
    setStartDate(startOfMonth(currentMonth));
    setEndDate(endOfMonth(currentMonth));
    setCurrentPage(1);
  };

  const handleEdit = (log: Worklog) => {
    setEditingLog(log);
    setEditedHours(log.hours);
    setEditedNote(log.note || '');
    setEditedTaskId(log.task_id || '');
    const logDate = new Date(log.created_at);
    setEditedDate(logDate);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingLog || !editedHours || !editedTaskId || !editedDate) {
      toast.error('Please fill all required fields');
      return;
    }

    // Use current time with selected date, preserving timezone
    const now = new Date();
    const year = editedDate.getFullYear();
    const month = editedDate.getMonth();
    const day = editedDate.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Create date in local timezone with current time
    const updatedDate = new Date(year, month, day, hours, minutes, seconds, 0);
    const isoString = updatedDate.toISOString();

    updateWorklogMutation.mutate({
      id: editingLog.id,
      data: {
        hours: editedHours,
        note: editedNote,
        task_id: editedTaskId,
        created_at: isoString,
      },
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingLog(null);
        setEditedHours('');
        setEditedNote('');
        setEditedTaskId('');
        setEditedDate(null);
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this worklog?')) {
      deleteWorklogMutation.mutate(id);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.error('No worklogs selected');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected worklog(s)?`)) {
      deleteMultipleWorklogsMutation.mutate(Array.from(selectedIds), {
        onSuccess: () => {
          setSelectedIds(new Set());
        },
      });
    }
  };

  const handleExportToCSV = () => {
    try {
      const worklogsToExport = selectedIds.size > 0
        ? filteredWorklogs.filter((log: Worklog) => selectedIds.has(log.id))
        : filteredWorklogs;

      exportWorklogsToCSV(worklogsToExport);
      toast.success(`Exported ${worklogsToExport.length} worklog(s) to CSV`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export CSV');
    }
  };

  const handleAddWorklog = (addAnother: boolean = false) => {
    if (!selectedTaskId || !worklogHours || !worklogDate) {
      toast.error('Please fill all required fields');
      return;
    }

    // Get project_id from selected task
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task?.project_id) {
      toast.error('Task must be associated with a project');
      return;
    }

    // Use current time with selected date, preserving timezone
    const now = new Date();
    const year = worklogDate.getFullYear();
    const month = worklogDate.getMonth();
    const day = worklogDate.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Create date in local timezone with current time
    const localDateTime = new Date(year, month, day, hours, minutes, seconds, 0);
    const isoString = localDateTime.toISOString();

    createWorklogMutation.mutate({
      hours: worklogHours,
      note: worklogNote,
      task_id: selectedTaskId,
      project_id: task.project_id,
      user_id: profile?.id || '',
      created_at: isoString,
      added_by: profile?.id || '',
    }, {
      onSuccess: () => {
        if (!addAnother) {
          setIsAddLogDialogOpen(false);
          setSelectedProjectId('');
          setSelectedTaskId('');
          setWorklogDate(new Date());
          setWorklogHours('');
          setWorklogNote('');
        } else {
          setSelectedTaskId('');
          setWorklogHours('');
          setWorklogNote('');
        }
      },
    });
  };

  const handleSidebarNavigation = (tab: string) => {
    if (tab === 'dashboard') {
      navigate('/user/dashboard');
    } else if (tab === 'calendar') {
      navigate('/user/calendar');
    } else if (tab === 'worklog-history') {
      navigate('/user/worklog-history');
    } else if (tab === 'projects') {
      navigate('/user/projects');
    } else if (tab === 'tasks') {
      navigate('/user/tasks');
    } else if (tab === 'task-tracker') {
      navigate('/user/task-tracker');
    } else if (tab === 'reports') {
      navigate('/user/reports');
    } else if (tab === 'shared-tables') {
      navigate('/user/shared-tables');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    } else if (tab === 'change-requests') {
      navigate('/user/change-requests');
    }
  };

  if (isLoading) {
    return (
      <UserPageLayout
        sidebar={<UserSidebar currentTab="" onTabChange={handleSidebarNavigation} />}
      >
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
          </div>
        </div>
      </UserPageLayout>
    );
  }

  return (
    <UserPageLayout
      sidebar={<UserSidebar currentTab="" onTabChange={handleSidebarNavigation} />}
    >
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
          <WorklogHistoryHeader 
            onAddWorklog={() => setIsAddLogDialogOpen(true)}
            canEdit={canEdit}
          />

          <DateRangeFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            tempStartDate={tempStartDate}
            tempEndDate={tempEndDate}
            onTempDateChange={(range) => {
              setTempStartDate(range.from);
              setTempEndDate(range.to);
            }}
            onConfirmDateRange={() => {
              if (tempStartDate && tempEndDate) {
                setStartDate(tempStartDate);
                setEndDate(tempEndDate);
                setIsDatePickerOpen(false);
              }
            }}
            onResetDateRange={() => {
              setTempStartDate(startOfMonth(currentMonth));
              setTempEndDate(endOfMonth(currentMonth));
            }}
            isDatePickerOpen={isDatePickerOpen}
            onDatePickerOpenChange={setIsDatePickerOpen}
            currentMonth={currentMonth}
          />

          <FilterBar
            projects={allProjects}
            tasks={tasks}
            selectedProject={selectedProject}
            selectedTask={selectedTask}
            selectedType={selectedType}
            minHours={minHours}
            maxHours={maxHours}
            searchQuery={searchQuery}
            onProjectChange={setSelectedProject}
            onTaskChange={setSelectedTask}
            onTypeChange={setSelectedType}
            onMinHoursChange={setMinHours}
            onMaxHoursChange={setMaxHours}
            onSearchChange={setSearchQuery}
            onReset={resetFilters}
          />

          <WorklogStatsCards
            totalHours={stats.totalHours}
            billableHours={stats.billableHours}
            nonBillableHours={stats.nonBillableHours}
            entries={stats.entries}
          />

          <SelectionActionsBar
            selectedCount={selectedIds.size}
            totalCount={filteredWorklogs.length}
            onDelete={handleDeleteSelected}
            onExport={handleExportToCSV}
            isDeleting={deleteMultipleWorklogsMutation.isPending}
            canEdit={canEdit}
          />

          <WorklogTable
            worklogs={paginatedWorklogs}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleAllSelection={toggleAllSelection}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <WorklogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredWorklogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>

      <EditWorklogDialogHistory
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        worklog={editingLog}
        tasks={tasks}
        editedHours={editedHours}
        editedNote={editedNote}
        editedTaskId={editedTaskId}
        editedDate={editedDate}
        onHoursChange={setEditedHours}
        onNoteChange={setEditedNote}
        onTaskIdChange={setEditedTaskId}
        onDateChange={setEditedDate}
        onSave={handleSaveEdit}
        isSaving={updateWorklogMutation.isPending}
      />

      <AddWorklogDialogHistory
        open={isAddLogDialogOpen}
        onOpenChange={setIsAddLogDialogOpen}
        projects={allProjects}
        tasks={tasks}
        selectedProjectId={selectedProjectId}
        selectedTaskId={selectedTaskId}
        worklogDate={worklogDate}
        worklogHours={worklogHours}
        worklogNote={worklogNote}
        onProjectChange={setSelectedProjectId}
        onTaskChange={setSelectedTaskId}
        onDateChange={setWorklogDate}
        onHoursChange={setWorklogHours}
        onNoteChange={setWorklogNote}
        onSave={handleAddWorklog}
        isSaving={createWorklogMutation.isPending}
        onCancel={() => {
          setIsAddLogDialogOpen(false);
          setSelectedProjectId('');
          setSelectedTaskId('');
          setWorklogDate(new Date());
          setWorklogHours('');
          setWorklogNote('');
        }}
      />
    </UserPageLayout>
  );
};

export default WorklogHistory;
