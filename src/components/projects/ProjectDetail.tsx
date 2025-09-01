import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Edit, MessageSquare, CheckSquare, Calendar, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StatusHistory } from '@/components/ui/status-history';

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  deadline: string | null;
  created_at: string;
  admin_id: string;
  description?: string;
  comments?: any;
  admin_name?: string;
}

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEdit: (project: Project) => void;
  onViewComments: (project: Project) => void;
  onViewTasks: (project: Project) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onEdit,
  onViewComments,
  onViewTasks,
}) => {
  const [loading, setLoading] = useState(false);
  const [projectStats, setProjectStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalHours: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectStats();
  }, [project.id]);

  const fetchProjectStats = async () => {
    try {
      setLoading(true);
      
      // Fetch task count and completion stats
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', project.id);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }

      const totalTasks = tasksData?.length || 0;
      const completedTasks = tasksData?.filter(task => task.status === 'Completed').length || 0;

      // Fetch total hours from work logs
      const { data: workLogsData, error: workLogsError } = await supabase
        .from('work_logs')
        .select('start_time, end_time')
        .eq('project_id', project.id);

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

      setProjectStats({
        totalTasks,
        completedTasks,
        totalHours: Math.round(totalHours * 100) / 100,
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
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
      case 'On Hold':
        return 'destructive';
      case 'Client Approval':
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
          Back to Projects
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.type}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(project)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => onViewComments(project)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Comments
          </Button>
          <Button variant="outline" onClick={() => onViewTasks(project)}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Admin</label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{project.admin_name || 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(project.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {project.deadline 
                        ? format(new Date(project.deadline), 'MMM dd, yyyy')
                        : 'Not set'
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              {project.description && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <div className="mt-1 flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{project.description}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <StatusHistory 
            entityId={project.id} 
            entityType="project" 
            title="Project Status History"
          />
        </div>

        {/* Project Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Statistics</CardTitle>
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
                    <div className="text-2xl font-bold text-primary">{projectStats.totalTasks}</div>
                    <div className="text-sm text-muted-foreground">Total Tasks</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{projectStats.completedTasks}</div>
                    <div className="text-sm text-muted-foreground">Completed Tasks</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{projectStats.totalHours}</div>
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                  </div>
                  
                  {projectStats.totalTasks > 0 && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Completion Rate</div>
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
