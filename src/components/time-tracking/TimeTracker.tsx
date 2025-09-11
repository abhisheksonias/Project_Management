import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  type: string;
  hasAssignedTasks?: boolean;
}

interface Task {
  id: string;
  name: string;
  project_id: string;
  status: string;
  assigned_user_id: string | null;
}

interface TimeTrackerProps {
  className?: string;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ className }) => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [note, setNote] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const { toast } = useToast();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTracking, startTime]);

  // Fetch projects with assigned task information
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id, 
            name,
            type,
            tasks(id, assigned_user_id, status)
          `)
          .order('name');

        if (error) {
          console.error('Error fetching projects:', error);
          toast({
            title: 'Error',
            description: 'Failed to load projects',
            variant: 'destructive',
          });
          return;
        }

        // Process projects to check for assigned non-completed tasks
        const processedProjects = (data || []).map(project => ({
          id: project.id,
          name: project.name,
          type: project.type || 'non-billable',
          hasAssignedTasks: project.tasks?.some((task: any) => 
            task.assigned_user_id === profile?.id && task.status?.toLowerCase() !== 'completed'
          ) || false
        }));

        setProjects(processedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
      } finally {
        setLoadingProjects(false);
      }
    };

    if (profile?.id) {
      fetchProjects();
    }
  }, [toast, profile?.id]);

  // Fetch tasks when project changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedProject) {
        setTasks([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, name, project_id, status, assigned_user_id')
          .eq('project_id', selectedProject)
          .neq('status', 'Completed') // Exclude completed tasks
          .order('name');

        if (error) {
          console.error('Error fetching tasks:', error);
          toast({
            title: 'Error',
            description: 'Failed to load tasks',
            variant: 'destructive',
          });
          return;
        }

        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tasks',
          variant: 'destructive',
        });
      }
    };

    fetchTasks();
  }, [selectedProject, toast]);

  const handleStartTracking = () => {
    if (!selectedProject) {
      toast({
        title: 'Error',
        description: 'Please select a project to start tracking',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTask) {
      toast({
        title: 'Error',
        description: 'Please select a task to start tracking',
        variant: 'destructive',
      });
      return;
    }

    setIsTracking(true);
    setStartTime(new Date());
    setElapsedTime(0);
  };

  const handleStopTracking = async () => {
    if (!startTime) return;

    setLoading(true);
    try {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Don't save sessions shorter than 1 minute
      if (duration < 60000) {
        toast({
          title: 'Session too short',
          description: 'Please track for at least 1 minute',
          variant: 'destructive',
        });
        return;
      }

      // Calculate hours in HH:MM format
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      const hoursFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('work_logs')
        .insert([{
          user_id: profile?.id,
          project_id: selectedProject,
          task_id: selectedTask,
          hours: hoursFormatted,
          note: note.trim() || null,
          added_by: profile?.name || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('Error saving work log:', error);
        toast({
          title: 'Error',
          description: 'Failed to save time entry',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Time entry saved successfully',
      });

      // Reset form
      setIsTracking(false);
      setStartTime(null);
      setElapsedTime(0);
      setNote('');
      setSelectedTask('');

    } catch (error) {
      console.error('Error saving work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to save time entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hoursCount = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hoursCount.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSelectedProjectName = () => {
    return projects.find(p => p.id === selectedProject)?.name || '';
  };

  const getSelectedTaskName = () => {
    return tasks.find(t => t.id === selectedTask)?.name || '';
  };

  // Sort projects: projects with assigned tasks first, then by name
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.hasAssignedTasks && !b.hasAssignedTasks) return -1;
    if (!a.hasAssignedTasks && b.hasAssignedTasks) return 1;
    
    // If both have same assignment status, sort by name
    return a.name.localeCompare(b.name);
  });

  // Sort tasks: assigned tasks first, then by name
  const sortedTasks = [...tasks].sort((a, b) => {
    const aAssigned = a.assigned_user_id === profile?.id;
    const bAssigned = b.assigned_user_id === profile?.id;
    
    if (aAssigned && !bAssigned) return -1;
    if (!aAssigned && bAssigned) return 1;
    
    // If both have same assignment status, sort by name
    return a.name.localeCompare(b.name);
  });

  const getProjectHighlightClass = (project: Project) => {
    return project.hasAssignedTasks ? 'font-medium text-blue-600' : '';
  };

  const getTaskStatusColor = (task: Task) => {
    if (task.assigned_user_id === profile?.id) {
      return 'text-blue-600'; // Highlight assigned tasks in blue
    }
    return 'text-muted-foreground';
  };

  const getTaskStatusIcon = (task: Task) => {
    if (task.assigned_user_id === profile?.id) {
      return '●'; // Show dot for assigned tasks
    }
    return '';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracker
        </CardTitle>
        <CardDescription>
          Track your work time on projects and tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Selection */}
        <div className="space-y-2">
          <Label htmlFor="project">Project *</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
            </SelectTrigger>
            <SelectContent>
              {sortedProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span className={getProjectHighlightClass(project)}>
                      {project.name}
                    </span>
                    {project.hasAssignedTasks && (
                      <Badge variant="outline" className="text-xs">
                        Has Tasks
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task Selection */}
        <div className="space-y-2">
          <Label htmlFor="task">Task *</Label>
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger>
              <SelectValue placeholder="Select a task" />
            </SelectTrigger>
            <SelectContent>
              {sortedTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  <div className="flex items-center gap-2">
                    <span className={getTaskStatusColor(task)}>
                      {getTaskStatusIcon(task)}
                    </span>
                    <span className={task.assigned_user_id === profile?.id ? 'font-medium' : ''}>
                      {task.name}
                    </span>
                    {task.assigned_user_id === profile?.id && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        Assigned
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="note">Note (Optional)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What are you working on?"
            rows={2}
          />
        </div>

        {/* Timer Display */}
        {isTracking && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Tracking time for{' '}
                {(() => {
                  const project = projects.find(p => p.id === selectedProject);
                  return (
                    <span className={project?.hasAssignedTasks ? 'font-medium text-blue-600' : ''}>
                      {getSelectedProjectName()}
                      {project?.hasAssignedTasks && ' (Has Tasks)'}
                    </span>
                  );
                })()}
                {getSelectedTaskName() && (
                  <>
                    {' - '}
                    {(() => {
                      const task = tasks.find(t => t.id === selectedTask);
                      return task ? (
                        <span className={task.assigned_user_id === profile?.id ? 'font-medium' : ''}>
                          <span className={getTaskStatusColor(task)}>
                            {getTaskStatusIcon(task)}
                          </span>
                          {' '}
                          {getSelectedTaskName()}
                          {task.assigned_user_id === profile?.id && ' (Assigned)'}
                        </span>
                      ) : (
                        getSelectedTaskName()
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button 
              onClick={handleStartTracking} 
              disabled={!selectedProject || !selectedTask || loadingProjects}
              className="flex-1"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Tracking
            </Button>
          ) : (
            <Button 
              onClick={handleStopTracking} 
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              <Square className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Stop & Save'}
            </Button>
          )}
        </div>

        {/* Current Selection Display */}
        {selectedProject && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Current Selection:</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{getSelectedProjectName()}</Badge>
              {getSelectedTaskName() && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline">{getSelectedTaskName()}</Badge>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium">Tips:</div>
            <ul className="mt-1 space-y-1">
              <li>• Select a project to start tracking</li>
              <li>• <span className="font-medium text-blue-600">Projects with assigned non-completed tasks appear first</span> and are highlighted</li>
              <li>• <span className="font-medium">Assigned tasks appear first</span> with blue indicators</li>
              <li>• <span className="text-blue-600">● Blue</span> = assigned to you, completed tasks are hidden</li>
              <li>• Add notes to describe your work</li>
              <li>• Sessions must be at least 1 minute long</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};