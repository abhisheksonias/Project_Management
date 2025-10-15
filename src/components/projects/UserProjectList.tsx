import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Eye, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ProjectComments } from './ProjectComments';

interface Project {
  id: string;
  name: string;
  type: string;
  category?: string;
  priority?: string;
  reference?: string;
  description: string | null;
  status: string | null;
  deadline: string | null;
  created_at: string;
  admin_id: string | null;
  comments: unknown;
  admin_name?: string;
  hasAssignedTasks?: boolean;
  assignedTasksCount?: number;
}

interface UserProjectListProps {
  className?: string;
}

export const UserProjectList: React.FC<UserProjectListProps> = ({ className }) => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState<Project | null>(null);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Fetch projects the user has access to (either as admin or through assigned tasks)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          users!projects_admin_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
        return;
      }

      // Fetch user's assigned tasks to determine which projects have active assigned tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('project_id, status')
        .eq('assigned_user_id', profile.id);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        toast({
          title: 'Error',
          description: 'Failed to load assigned tasks',
          variant: 'destructive',
        });
        return;
      }

      // Create a map of project IDs to active (non-completed) task counts
      const projectActiveTaskCounts = new Map<string, number>();
      (tasksData || []).forEach(task => {
        // Only count tasks that are not completed
        if (task.status?.toLowerCase() !== 'completed') {
          const count = projectActiveTaskCounts.get(task.project_id) || 0;
          projectActiveTaskCounts.set(task.project_id, count + 1);
        }
      });

      // Process projects to include admin name and active task information
      const processedProjects = (projectsData || [])
        .filter(project => {
          const status = project.status?.toLowerCase();
          return status !== 'completed' && status !== 'cancelled'; // Filter out completed and cancelled projects
        })
        .map(project => {
          const assignedTasksCount = projectActiveTaskCounts.get(project.id) || 0;
          return {
            ...project,
            admin_name: project.users?.name || 'Unknown Admin',
            hasAssignedTasks: assignedTasksCount > 0,
            assignedTasksCount
          };
        });

      // Sort projects: projects with active tasks first, then by task count, then by creation date
      const sortedProjects = processedProjects.sort((a, b) => {
        // First priority: projects with active assigned tasks
        if (a.hasAssignedTasks && !b.hasAssignedTasks) return -1;
        if (!a.hasAssignedTasks && b.hasAssignedTasks) return 1;
        
        // Second priority: number of active assigned tasks (more tasks first)
        if (a.hasAssignedTasks && b.hasAssignedTasks) {
          return b.assignedTasksCount! - a.assignedTasksCount!;
        }
        
        // Third priority: creation date (newer first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setProjects(sortedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id, toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCommentsClick = (project: Project) => {
    setShowComments(project);
  };

  const handleCommentsClose = () => {
    setShowComments(null);
  };

  const handleCommentAdded = () => {
    // Refresh projects to get updated comments
    fetchProjects();
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'completed':
        return 'outline';
      case 'on hold':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'development':
        return 'default';
      case 'design':
        return 'secondary';
      case 'research':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            My Projects
          </CardTitle>
          <CardDescription>Projects you have access to</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading projects...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            My Projects
          </CardTitle>
          <CardDescription className="text-sm">Projects you have access to</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">No projects found.</div>
              <div className="text-sm text-muted-foreground mt-1">
                You don't have access to any projects yet.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="text-xs py-2 w-8"></TableHead>
                    <TableHead className="text-xs py-2">Name</TableHead>
                    <TableHead className="text-xs py-2">Type</TableHead>
                    <TableHead className="text-xs py-2">Priority</TableHead>
                    <TableHead className="text-xs py-2">Status</TableHead>
                    <TableHead className="text-xs py-2">Admin</TableHead>
                    <TableHead className="text-xs py-2">Deadline</TableHead>
                    <TableHead className="text-xs py-2">Comments</TableHead>
                    <TableHead className="text-xs py-2">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const commentsCount = Array.isArray(project.comments) ? project.comments.length : 0;
                    
                    return (
                      <TableRow 
                        key={project.id} 
                        className="h-10 hover:bg-muted/50"
                      >
                        <TableCell className="py-2 px-2">
                          {project.hasAssignedTasks && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"
                              title={`${project.assignedTasksCount} active task${project.assignedTasksCount !== 1 ? 's' : ''} assigned`}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium py-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="font-medium text-sm">{project.name}</div>
                              {project.hasAssignedTasks && (
                                <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-blue-500">
                                  {project.assignedTasksCount} active
                                </Badge>
                              )}
                            </div>
                            {project.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {project.description.length > 80 
                                  ? `${project.description.substring(0, 80)}...` 
                                  : project.description
                                }
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant={getTypeBadgeVariant(project.type)} className="text-xs px-1.5 py-0.5">
                            {project.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge 
                            variant={
                              project.priority === 'Critical' ? 'destructive' :
                              project.priority === 'High' ? 'default' :
                              project.priority === 'Medium' ? 'secondary' :
                              project.priority === 'Low' ? 'outline' :
                              'outline'
                            }
                            className="text-xs px-1.5 py-0.5"
                          >
                            {project.priority || 'Not Set'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant={getStatusBadgeVariant(project.status)} className="text-xs px-1.5 py-0.5">
                            {project.status || 'Not Set'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{project.admin_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {project.deadline ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">
                                {format(new Date(project.deadline), 'MMM dd')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No deadline</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{commentsCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCommentsClick(project)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 h-7"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {commentsCount > 0 ? 'View' : 'Add'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments Modal */}
      {showComments && (
        <ProjectComments
          project={showComments}
          onClose={handleCommentsClose}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </div>
  );
};
