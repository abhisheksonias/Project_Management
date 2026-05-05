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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Project } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';
import { normalizeHoursToHHMM } from '@/shared/utils/formatHours';
import { TimerWidget } from './TimerWidget';
import { useTimerTracker } from '../hooks/useTimerTracker';
import { calculateWorklogHoursFromElapsed } from '@/shared/utils/calculateWorklogHours';

interface AddWorklogDialogHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  selectedTaskId: string;
  worklogDate: Date | undefined;
  worklogHours: string;
  worklogNote: string;
  onProjectChange: (projectId: string) => void;
  onTaskChange: (taskId: string) => void;
  onDateChange: (date: Date | undefined) => void;
  onHoursChange: (hours: string) => void;
  onNoteChange: (note: string) => void;
  onSave: (addAnother: boolean) => void;
  isSaving: boolean;
  onCancel: () => void;
  initialMode?: 'manual' | 'timer';
}

export const AddWorklogDialogHistory: React.FC<AddWorklogDialogHistoryProps> = ({
  open,
  onOpenChange,
  projects,
  tasks,
  selectedProjectId,
  selectedTaskId,
  worklogDate,
  worklogHours,
  worklogNote,
  onProjectChange,
  onTaskChange,
  onDateChange,
  onHoursChange,
  onNoteChange,
  onSave,
  isSaving,
  onCancel,
  initialMode = 'manual',
}) => {
  const [mode, setMode] = useState<'manual' | 'timer'>(initialMode);
  const [timerStartTime, setTimerStartTime] = useState<string | null>(null);
  const timer = useTimerTracker();

  // Handle timer start
  const handleTimerStart = () => {
    if (!timerStartTime) {
      setTimerStartTime(new Date().toISOString());
    }
    timer.start();
  };

  // Handle timer stopped
  const handleTimerStop = (elapsedSeconds: number) => {
    const { hours } = calculateWorklogHoursFromElapsed(elapsedSeconds);
    onHoursChange(hours);
    // Keep the dialog open for user to review and add notes if needed
  };

  // Handle save with timer data
  const handleSaveWorklog = (addAnother: boolean) => {
    if (mode === 'timer' && timerStartTime && timer.elapsedSeconds > 0) {
      // Calculate end_time as start_time + elapsed seconds
      const startDate = new Date(timerStartTime);
      const endDate = new Date(startDate.getTime() + timer.elapsedSeconds * 1000);
      onSave(addAnother, {
        startTime: timerStartTime,
        endTime: endDate.toISOString(),
      });
      // Reset timer state
      setTimerStartTime(null);
    } else {
      onSave(addAnother);
    }
  };

  // Handle dialog close - reset timer if user cancels
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && mode === 'timer' && timer.isRunning) {
      timer.pause(); // Just pause, don't reset - user might reopen
    }
    onOpenChange(newOpen);
  };

  // Filter out completed and on hold tasks first
  const activeTasks = tasks.filter((task) => {
    const taskStatus = (task.status || '').toLowerCase();
    return taskStatus !== 'completed' && taskStatus !== 'on hold';
  });

  // Get unique project IDs from active tasks
  const projectIdsWithActiveTasks = new Set(
    activeTasks
      .map((task) => task.project_id)
      .filter((id): id is string => id !== null && id !== undefined)
  );

  // Filter projects to only show those with active tasks
  const availableProjects = projects.filter((project) => {
    const projectStatus = (project.status || '').toLowerCase();
    const isNotCompletedOrOnHold = projectStatus !== 'completed' && projectStatus !== 'on hold';
    const hasActiveTasks = projectIdsWithActiveTasks.has(project.id);
    return isNotCompletedOrOnHold && hasActiveTasks;
  });

  // Filter tasks by selected project
  const filteredTasks = selectedProjectId
    ? activeTasks.filter((task) => task.project_id === selectedProjectId)
    : activeTasks;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Log Work</DialogTitle>
          <DialogDescription>
            {mode === 'timer' ? 'Track time with a timer' : 'Add a new work log entry manually'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'manual' | 'timer')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="timer">Timer</TabsTrigger>
          </TabsList>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={(value) => {
                      onProjectChange(value);
                      onTaskChange(''); // Reset task when project changes
                    }}
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task">Task</Label>
                  <Select value={selectedTaskId} onValueChange={onTaskChange}>
                    <SelectTrigger id="task">
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !worklogDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {worklogDate ? format(worklogDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={worklogDate}
                        onSelect={onDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    type="text"
                    placeholder="08:00"
                    value={worklogHours}
                    onChange={(e) => {
                      const value = e.target.value;
                      const hhmmPattern = /^\d{0,2}:?\d{0,2}$/;
                      const decimalPattern = /^\d*\.?\d*$/;

                      if (value === '' || hhmmPattern.test(value) || decimalPattern.test(value)) {
                        onHoursChange(value);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        const normalized = normalizeHoursToHHMM(e.target.value);
                        onHoursChange(normalized);
                      }
                    }}
                    maxLength={5}
                  />
                  <div className="flex gap-2 mt-2">
                    {['04:00', '08:00', '02:00'].map((val) => (
                      <Button
                        key={val}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-full text-xs"
                        onClick={() => onHoursChange(val)}
                      >
                        {val}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Description (optional)</Label>
                  <RichTextEditor
                    value={worklogNote}
                    onChange={onNoteChange}
                    placeholder="Add a description..."
                    showToolbar={false}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Timer Tab */}
          <TabsContent value="timer" className="space-y-4 py-4">
            <div className="space-y-4">
              {/* Project and Task Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-timer">Project</Label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={(value) => {
                      onProjectChange(value);
                      onTaskChange('');
                    }}
                  >
                    <SelectTrigger id="project-timer">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-timer">Task</Label>
                  <Select value={selectedTaskId} onValueChange={onTaskChange}>
                    <SelectTrigger id="task-timer">
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Timer Widget */}
              <TimerWidget
                elapsedSeconds={timer.elapsedSeconds}
                isRunning={timer.isRunning}
                formattedTime={timer.formattedTime}
                onStart={handleTimerStart}
                onPause={timer.pause}
                onResume={timer.resume}
                onStop={handleTimerStop}
                onReset={() => {
                  timer.reset();
                  setTimerStartTime(null);
                }}
                disabled={!selectedProjectId || !selectedTaskId}
              />

              {/* Date and Note (shown after stopping timer) */}
              {timer.elapsedSeconds > 0 && !timer.isRunning && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-timer">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !worklogDate && 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {worklogDate ? format(worklogDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={worklogDate}
                          onSelect={onDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hours-display">Hours Tracked</Label>
                    <Input
                      id="hours-display"
                      type="text"
                      value={worklogHours}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="note-timer">Description (optional)</Label>
                <RichTextEditor
                  value={worklogNote}
                  onChange={onNoteChange}
                  placeholder="Add a description..."
                  showToolbar={false}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSaveWorklog(true)}
            disabled={isSaving || !worklogHours}
            variant="outline"
            className="bg-primary/10 text-primary hover:bg-primary/20"
          >
            {isSaving ? 'Saving...' : 'Save & Add Another'}
          </Button>
          <Button
            onClick={() => handleSaveWorklog(false)}
            disabled={isSaving || !worklogHours}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isSaving ? 'Saving...' : 'Save Log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

