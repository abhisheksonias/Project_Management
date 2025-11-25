import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarWorklogs } from '@/features/calendar/hooks/useCalendarWorklogs';
import { useCalendarProjects } from '@/features/calendar/hooks/useCalendarProjects';
import { useCalendarTasks } from '@/features/calendar/hooks/useCalendarTasks';
import { useCreateWorklog, useUpdateWorklog, useDeleteWorklog } from '@/features/calendar/hooks/useCalendarMutations';
import { CalendarHeader } from '@/features/calendar/ui/CalendarHeader';
import { CalendarNavigation } from '@/features/calendar/ui/CalendarNavigation';
import { CalendarStats } from '@/features/calendar/ui/CalendarStats';
import { CalendarGrid } from '@/features/calendar/ui/CalendarGrid';
import { DayDetailsSheet } from '@/features/calendar/ui/DayDetailsSheet';
import { EditWorklogDialog } from '@/features/calendar/ui/EditWorklogDialog';
import { AddWorklogDialog } from '@/features/calendar/ui/AddWorklogDialog';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';

const CalendarView: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // UI State only
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Edit worklog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Worklog | null>(null);
  const [editedHours, setEditedHours] = useState<string>('');
  const [editedNote, setEditedNote] = useState<string>('');
  const [editedDate, setEditedDate] = useState<Date | null>(null);

  // Add worklog state
  const [isAddLogDialogOpen, setIsAddLogDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [worklogHours, setWorklogHours] = useState<string>('');
  const [worklogNote, setWorklogNote] = useState<string>('');

  // Data fetching via hooks (services)
  const { data: worklogs = [], isLoading } = useCalendarWorklogs(
    profile?.id || '',
    currentMonth
  );
  const { data: projects = [] } = useCalendarProjects(profile?.id || '');
  const { data: allTasks = [] } = useCalendarTasks();

  // Mutations via hooks
  const createWorklogMutation = useCreateWorklog();
  const updateWorklogMutation = useUpdateWorklog();
  const deleteWorklogMutation = useDeleteWorklog();

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    
    if (viewMode === 'month') {
      const newMonth = new Date(year, month + (direction === 'next' ? 1 : -1), 1);
      setCurrentMonth(newMonth);
    } else {
      const newWeek = direction === 'next' ? addWeeks(currentMonth, 1) : subWeeks(currentMonth, 1);
      setCurrentMonth(newWeek);
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Calculate stats from worklogs
  const stats = useMemo(() => {
    let billableHours = 0;
    let nonBillableHours = 0;

    worklogs.forEach((log: Worklog) => {
      const [hoursStr, minutesStr] = log.hours.split(':');
      const hours = parseInt(hoursStr) + parseInt(minutesStr) / 60;

      const taskType = log.tasks?.type?.toLowerCase();

      if (taskType === 'billable') {
        billableHours += hours;
      } else {
        nonBillableHours += hours;
      }
    });

    return {
      billableHours: Math.round(billableHours * 10) / 10,
      nonBillableHours: Math.round(nonBillableHours * 10) / 10,
      totalHours: Math.round((billableHours + nonBillableHours) * 10) / 10,
    };
  }, [worklogs]);

  // Group worklogs by date
  const worklogsByDate = useMemo(() => {
    const grouped = new Map<string, { billable: number; nonBillable: number }>();

    worklogs.forEach((log: Worklog) => {
      const dateStr = log.created_at.split('T')[0];
      const [hoursStr, minutesStr] = log.hours.split(':');
      const hours = parseInt(hoursStr) + parseInt(minutesStr) / 60;

      const taskType = log.tasks?.type?.toLowerCase();

      const isBillable = taskType === 'billable';

      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, { billable: 0, nonBillable: 0 });
      }

      const entry = grouped.get(dateStr)!;
      if (isBillable) {
        entry.billable += hours;
      } else {
        entry.nonBillable += hours;
      }
    });

    return grouped;
  }, [worklogs]);

  // Get calendar days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const firstDay = startOfMonth(currentMonth);
      const lastDay = endOfMonth(currentMonth);
      const startCalendar = startOfWeek(firstDay, { weekStartsOn: 0 });
      const endCalendar = endOfWeek(lastDay, { weekStartsOn: 0 });
      
      return eachDayOfInterval({ start: startCalendar, end: endCalendar });
    } else {
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
      return eachDayOfInterval({ 
        start: weekStart, 
        end: endOfWeek(weekStart, { weekStartsOn: 0 })
      });
    }
  }, [currentMonth, viewMode]);

  // Handlers
  const handleEdit = (log: Worklog) => {
    setEditingLog(log);
    setEditedHours(log.hours);
    setEditedNote(log.note || '');
    const logDate = new Date(log.created_at);
    setEditedDate(logDate);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingLog || !editedHours || !editingLog.task_id || !editedDate) {
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
        task_id: editingLog.task_id,
        created_at: isoString,
      },
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingLog(null);
        setEditedHours('');
        setEditedNote('');
        setEditedDate(null);
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this worklog?')) {
      deleteWorklogMutation.mutate(id);
    }
  };

  const handleAddWorklog = () => {
    if (!selectedTaskId || !worklogHours || !selectedDate) {
      return;
    }

    // Get project_id from selected task
    const task = allTasks.find((t) => t.id === selectedTaskId);
    if (!task?.project_id) {
      return;
    }

    // Use current time with selected date, preserving timezone
    const now = new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
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
        setIsAddLogDialogOpen(false);
        setSelectedProjectId('');
        setSelectedTaskId('');
        setWorklogHours('');
        setWorklogNote('');
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
    } else if (tab === 'reports') {
      navigate('/user/reports');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-white">
        <UserSidebar currentTab="calendar" onTabChange={handleSidebarNavigation} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <UserSidebar currentTab="calendar" onTabChange={handleSidebarNavigation} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <CalendarHeader />
          <CalendarNavigation
            currentMonth={currentMonth}
            viewMode={viewMode}
            onNavigate={navigateMonth}
            onGoToToday={goToToday}
            onViewModeChange={setViewMode}
          />
          <CalendarStats
            billableHours={stats.billableHours}
            nonBillableHours={stats.nonBillableHours}
            totalHours={stats.totalHours}
          />
          <CalendarGrid
            calendarDays={calendarDays}
            currentMonth={currentMonth}
            worklogsByDate={worklogsByDate}
            onDateClick={setSelectedDate}
          />
        </div>
      </div>

      <DayDetailsSheet
        selectedDate={selectedDate}
        worklogs={worklogs}
        onClose={() => setSelectedDate(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddWorklog={() => setIsAddLogDialogOpen(true)}
      />

      <EditWorklogDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        worklog={editingLog}
        tasks={allTasks}
        editedHours={editedHours}
        editedNote={editedNote}
        editedDate={editedDate}
        onHoursChange={setEditedHours}
        onNoteChange={setEditedNote}
        onDateChange={setEditedDate}
        onSave={handleSaveEdit}
        isSaving={updateWorklogMutation.isPending}
      />

      <AddWorklogDialog
        open={isAddLogDialogOpen}
        onOpenChange={setIsAddLogDialogOpen}
        selectedDate={selectedDate}
        projects={projects}
        tasks={allTasks}
        selectedProjectId={selectedProjectId}
        selectedTaskId={selectedTaskId}
        worklogHours={worklogHours}
        worklogNote={worklogNote}
        onProjectChange={setSelectedProjectId}
        onTaskChange={setSelectedTaskId}
        onHoursChange={setWorklogHours}
        onNoteChange={setWorklogNote}
        onDateChange={setSelectedDate}
        onSave={handleAddWorklog}
        isSaving={createWorklogMutation.isPending}
        onCancel={() => {
          setIsAddLogDialogOpen(false);
          setSelectedProjectId('');
          setSelectedTaskId('');
          setWorklogHours('');
          setWorklogNote('');
        }}
      />
    </div>
  );
};

export default CalendarView;
