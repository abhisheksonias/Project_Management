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
}

interface Task {
  id: string;
  name: string;
  project_id: string;
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

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
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

        setProjects(data || []);
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

    fetchProjects();
  }, [toast]);

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
          .select('id, name, project_id')
          .eq('project_id', selectedProject)
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

      const { error } = await supabase
        .from('work_logs')
        .insert([{
          user_id: profile?.id,
          project_id: selectedProject,
          task_id: selectedTask || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          note: note.trim() || null,
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSelectedProjectName = () => {
    return projects.find(p => p.id === selectedProject)?.name || '';
  };

  const getSelectedTaskName = () => {
    return tasks.find(t => t.id === selectedTask)?.name || '';
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
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task Selection */}
        <div className="space-y-2">
          <Label htmlFor="task">Task (Optional)</Label>
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger>
              <SelectValue placeholder="Select a task (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-task">No specific task</SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
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
                Tracking time for {getSelectedProjectName()}
                {getSelectedTaskName() && ` - ${getSelectedTaskName()}`}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button 
              onClick={handleStartTracking} 
              disabled={!selectedProject || loadingProjects}
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
              <li>• Optional: Select a specific task</li>
              <li>• Add notes to describe your work</li>
              <li>• Sessions must be at least 1 minute long</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};