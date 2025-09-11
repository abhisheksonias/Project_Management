import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  hasAssignedTasks?: boolean;
}

interface Task {
  id: string;
  name: string;
  project_id: string;
  status: string;
  assigned_user_id: string | null;
}

interface ManualWorkLogFormProps {
  onSuccess?: () => void;
  className?: string;
}

export const ManualWorkLogForm: React.FC<ManualWorkLogFormProps> = ({ 
  onSuccess, 
  className 
}) => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<string>('');
  const [note, setNote] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const { toast } = useToast();

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
        setSelectedTask('no-task');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, name, project_id, status, assigned_user_id')
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
        setSelectedTask(''); // Reset task selection when project changes
        setSelectedTaskStatus(''); // Reset task status when project changes
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

  // Set default values
  useEffect(() => {
    const today = new Date();
    setWorkDate(today.toISOString().slice(0, 10)); // Format: YYYY-MM-DD
    setDuration('01:00'); // Default to 1 hour
  }, []);

  // Set task status when task is selected
  useEffect(() => {
    if (selectedTask) {
      const task = tasks.find(t => t.id === selectedTask);
      if (task) {
        console.log('Selected task:', task.name, 'Current Status from DB:', task.status);
        setSelectedTaskStatus(task.status);
      }
    } else {
      setSelectedTaskStatus('');
    }
  }, [selectedTask, tasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) {
      toast({
        title: 'Error',
        description: 'Please select a project',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTask) {
      toast({
        title: 'Error',
        description: 'Please select a task',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTaskStatus) {
      toast({
        title: 'Error',
        description: 'Please select a task status',
        variant: 'destructive',
      });
      return;
    }

    if (!workDate) {
      toast({
        title: 'Error',
        description: 'Please select a work date',
        variant: 'destructive',
      });
      return;
    }

    if (!duration) {
      toast({
        title: 'Error',
        description: 'Please enter the duration worked',
        variant: 'destructive',
      });
      return;
    }

    // Validate duration format (HH:MM)
    const durationRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!durationRegex.test(duration)) {
      toast({
        title: 'Error',
        description: 'Please enter duration in HH:MM format (e.g., 02:30)',
        variant: 'destructive',
      });
      return;
    }

    // Parse duration
    const [hours, minutes] = duration.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes < 1) {
      toast({
        title: 'Error',
        description: 'Work log must be at least 1 minute long',
        variant: 'destructive',
      });
      return;
    }

    // Convert duration to HH:MM format
    const hoursCount = Math.floor(totalMinutes / 60);
    const minutesCount = totalMinutes % 60;
    const hoursFormatted = `${hoursCount.toString().padStart(2, '0')}:${minutesCount.toString().padStart(2, '0')}`;

    setLoading(true);
    try {
      // First, update the task status if it has changed
      if (selectedTask && selectedTaskStatus) {
        const currentTask = tasks.find(t => t.id === selectedTask);
        if (currentTask && currentTask.status !== selectedTaskStatus) {
          const { error: taskUpdateError } = await supabase
            .from('tasks')
            .update({ status: selectedTaskStatus })
            .eq('id', selectedTask);

          if (taskUpdateError) {
            console.error('Error updating task status:', taskUpdateError);
            toast({
              title: 'Warning',
              description: 'Work log saved but task status update failed',
              variant: 'destructive',
            });
          }
        }
      }

      // Then save the work log
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
          description: 'Failed to save work log',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Work log added successfully',
      });

      // Reset form
      setNote('');
      setSelectedTask('');
      setSelectedTaskStatus('');
      setDuration('01:00'); // Reset to default duration
      // Keep project and work date for convenience

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error saving work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to save work log',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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

  const getProjectHighlightClass = (project: Project) => {
    return project.hasAssignedTasks ? 'font-medium text-blue-600' : '';
  };


  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Work Log
        </CardTitle>
        <CardDescription>
          Manually add a work log entry with specific start and end times
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Task Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="taskStatus">Status of Task *</Label>
            <Select 
              value={selectedTaskStatus} 
              onValueChange={setSelectedTaskStatus}
              disabled={!selectedTask}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedTask ? "Select task status" : "Select a task first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Work Date and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workDate">Work Date *</Label>
              <Input
                id="workDate"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration Worked *</Label>
              <Input
                id="duration"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="HH:MM (e.g., 02:30)"
                required
              />
            </div>
          </div>

          {/* Duration Display */}
          {duration && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Duration:</span>
                <Badge variant="secondary">{duration}</Badge>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>

          {/* Current Selection Display */}
          {selectedProject && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Work Log Details:</div>
              <div className="flex items-center gap-2 mt-1">
                {(() => {
                  const project = projects.find(p => p.id === selectedProject);
                  return (
                    <Badge 
                      variant={project?.hasAssignedTasks ? "default" : "secondary"}
                      className={project?.hasAssignedTasks ? 'font-medium' : ''}
                    >
                      {getSelectedProjectName()}
                      {project?.hasAssignedTasks && (
                        <span className="ml-1 text-xs">(Has Tasks)</span>
                      )}
                    </Badge>
                  );
                })()}
                {getSelectedTaskName() && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const task = tasks.find(t => t.id === selectedTask);
                        return task ? (
                          <>
                            <span className={getTaskStatusColor(task)}>
                              {getTaskStatusIcon(task)}
                            </span>
                            <Badge 
                              variant={task.assigned_user_id === profile?.id ? "default" : "outline"}
                              className={task.assigned_user_id === profile?.id ? 'font-medium' : ''}
                            >
                              {getSelectedTaskName()}
                            </Badge>
                            {task.assigned_user_id === profile?.id && (
                              <Badge variant="outline" className="text-xs">
                                Assigned
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">{getSelectedTaskName()}</Badge>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={!selectedProject || !selectedTask || !selectedTaskStatus || !workDate || !duration || loading}
            className="w-full"
          >
            {loading ? 'Adding...' : 'Add Work Log'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
