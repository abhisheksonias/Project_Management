import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Edit, MessageCircle, Calendar, User, FileText, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StatusHistory } from '@/components/ui/status-history';

interface Task {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  estimate_hours: number;
  created_at: string;
  updated_at: string;
  assigned_user_id: string;
  project_id: string;
  comment: any;
  assigned_user?: {
    name: string;
  };
  project?: {
    name: string;
  };
}

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
  onEdit: (task: Task) => void;
  onViewComments: (task: Task) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  onBack,
  onEdit,
  onViewComments,
}) => {
  const [loading, setLoading] = useState(false);
  const [taskStats, setTaskStats] = useState({
    totalHours: 0,
    lastWorked: null as string | null,
    workSessions: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTaskStats();
  }, [task.id]);

  const fetchTaskStats = async () => {
    try {
      setLoading(true);
      
      // Fetch work log data for this task
      const { data: workLogsData, error: workLogsError } = await supabase
        .from('work_logs')
        .select('start_time, end_time')
        .eq('task_id', task.id)
        .order('start_time', { ascending: false });

      if (workLogsError) {
        console.error('Error fetching work logs:', workLogsError);
        return;
      }

      const totalHours = workLogsData?.reduce((total, log) => {
        if (log.start_time && log.end_time) {
          const start = new Date(log.start_time);
          const end = new Date(log.end_time);
          const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
          return total + duration;
        }
        return total;
      }, 0) || 0;

      const lastWorked = workLogsData?.[0]?.end_time || null;
      const workSessions = workLogsData?.length || 0;

      setTaskStats({
        totalHours: Math.round(totalHours * 100) / 100,
        lastWorked,
        workSessions,
      });
    } catch (error) {
      console.error('Error fetching task stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      case 'Review':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'feature':
        return 'default';
      case 'bug':
        return 'destructive';
      case 'documentation':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{task.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getTypeBadgeVariant(task.type)}>{task.type}</Badge>
            <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => onViewComments(task)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Comments
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{task.assigned_user?.name || 'Unassigned'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <div className="mt-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{task.project?.name || 'Unknown Project'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(task.updated_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estimate</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span>{task.estimate_hours ? `${task.estimate_hours}h` : 'Not set'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Actual Hours</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{taskStats.totalHours}h</span>
                  </div>
                </div>
              </div>
              
              {task.description && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <div className="mt-1 flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{task.description}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <StatusHistory 
            entityId={task.id} 
            entityType="task" 
            title="Task Status History"
          />
        </div>

        {/* Task Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{taskStats.totalHours}</div>
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{taskStats.workSessions}</div>
                    <div className="text-sm text-muted-foreground">Work Sessions</div>
                  </div>
                  
                  {taskStats.lastWorked && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {format(new Date(taskStats.lastWorked), 'MMM dd')}
                      </div>
                      <div className="text-sm text-muted-foreground">Last Worked</div>
                    </div>
                  )}
                  
                  {task.estimate_hours && taskStats.totalHours > 0 && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round((taskStats.totalHours / task.estimate_hours) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Estimate vs Actual</div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
