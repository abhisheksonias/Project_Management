import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Edit, MessageSquare, Eye, CheckSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface ProjectListProps {
  onEditProject: (project: Project) => void;
  onViewTasks?: (project: Project) => void;
  onViewComments: (project: Project) => void;
  onViewDetails?: (project: Project) => void;
  refreshTrigger: number;
}

export const ProjectList: React.FC<ProjectListProps> = ({ 
  onEditProject, 
  onViewComments, 
  onViewTasks,
  onViewDetails,
  refreshTrigger 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch projects with admin names via join
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          admin:users!projects_admin_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProjects = data?.map(project => ({
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status || 'Open',
        deadline: project.deadline,
        created_at: project.created_at || new Date().toISOString(),
        admin_id: project.admin_id || '',
        description: project.description || '',
        comments: project.comments,
        admin_name: project.admin?.name || 'Unknown',
      })) || [];

      setProjects(formattedProjects);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading projects...</div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No projects found.</p>
            <p className="text-sm mt-2">Create your first project to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.type}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.deadline 
                      ? format(new Date(project.deadline), 'MMM dd, yyyy')
                      : 'Not set'
                    }
                  </TableCell>
                  <TableCell>
                    {format(new Date(project.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{project.admin_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {onViewDetails && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewDetails(project)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditProject(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewComments(project)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {onViewTasks && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewTasks(project)}
                        >
                          <CheckSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};