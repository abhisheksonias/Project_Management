import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Edit, MessageSquare, Eye, CheckSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const { profile } = useAuth();

  const projectStatusOptions = ['Open', 'In Progress', 'Completed', 'On Hold', 'Client Approval'];

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      // Find the current project to get the old status
      const currentProject = projects.find(p => p.id === projectId);
      const oldStatus = currentProject?.status;

      // Update project status
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update project status',
          variant: 'destructive',
        });
        return;
      }

      // Log status change in history
      if (profile?.id && oldStatus !== newStatus) {
        const { error: historyError } = await supabase
          .from('status_history')
          .insert({
            entity_id: projectId,
            entity_type: 'project',
            status: newStatus,
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          });

        if (historyError) {
          console.error('Error logging status change:', historyError);
          // Don't show error to user as the main operation succeeded
        }
      }

      // Update local state
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId
            ? { ...project, status: newStatus }
            : project
        )
      );

      toast({
        title: 'Success',
        description: 'Project status updated successfully',
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project status',
        variant: 'destructive',
      });
    }
  };

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

  // Filter projects based on status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(projects.filter(project => project.status === statusFilter));
    }
  }, [projects, statusFilter]);

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

  if (filteredProjects.length === 0 && statusFilter !== 'all') {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Projects</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {projectStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No projects found with status "{statusFilter}".</p>
            <p className="text-sm mt-2">Try selecting a different status or "All Status".</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>All Projects</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter by status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {projectStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
              {filteredProjects.map((project) => (
                <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.type}</TableCell>
                  <TableCell>
                    <Select
                      value={project.status}
                      onValueChange={(value) => handleStatusChange(project.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projectStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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