import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Edit, MessageSquare, Eye, CheckSquare, Info, Search, X, BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  type: string;
  category?: string;
  priority?: string;
  reference?: string;
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
  onViewPerformance?: (project: Project) => void;
  refreshTrigger: number;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  onEditProject,
  onViewComments,
  onViewTasks,
  onViewDetails,
  onViewPerformance,
  refreshTrigger
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();
  const { profile } = useAuth();

  const projectStatusOptions = ['Open', 'In Progress', 'Completed', 'On Hold', 'Client Approval'];
  const projectCategoryOptions = ['One-time', 'Maintenance', 'Hourly'];

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
        category: project.category,
        priority: project.priority,
        reference: project.reference,
        status: project.status || 'Open',
        deadline: project.deadline,
        created_at: project.created_at || new Date().toISOString(),
        admin_id: project.admin_id || '',
        description: project.description || '',
        comments: project.comments,
        admin_name: project.admin?.name || 'Unknown',
      })) || [];

      // Custom sorting: Latest first, but completed projects at bottom
      const sortedProjects = formattedProjects.sort((a, b) => {
        const aIsCompleted = a.status?.toLowerCase() === 'completed';
        const bIsCompleted = b.status?.toLowerCase() === 'completed';

        // If one is completed and other is not, put completed at bottom
        if (aIsCompleted && !bIsCompleted) return 1;
        if (!aIsCompleted && bIsCompleted) return -1;

        // If both have same completion status, sort by created_at (latest first)
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      });

      setProjects(sortedProjects);
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

  // Filter projects based on status, category, and search query
  useEffect(() => {
    let filtered = projects;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(project => project.category === categoryFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.type.toLowerCase().includes(query) ||
        (project.category && project.category.toLowerCase().includes(query)) ||
        (project.reference && project.reference.toLowerCase().includes(query)) ||
        (project.description && project.description.toLowerCase().includes(query)) ||
        (project.admin_name && project.admin_name.toLowerCase().includes(query))
      );
    }

    setFilteredProjects(filtered);
  }, [projects, statusFilter, categoryFilter, searchQuery]);

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
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="text-xl">All Projects</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all your projects
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-center">
              <p className="text-muted-foreground font-medium">Loading projects...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch your data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="text-xl">All Projects</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all your projects
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No projects found</h3>
              <p className="text-muted-foreground mt-1">Get started by creating your first project</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredProjects.length === 0 && (statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery.trim())) {
    return (
      <Card>
              <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="text-xl">All Projects</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all your projects
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name, type, category, reference, or admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* <span className="text-sm font-medium text-muted-foreground">Status:</span> */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
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
              <div className="flex items-center gap-2">
                {/* <span className="text-sm font-medium text-muted-foreground">Category:</span> */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {projectCategoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    onEditProject(null);
                  }}
                  className="flex items-center gap-2"
                >
                  Add Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No projects found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery.trim()
                  ? `No projects match "${searchQuery}"`
                  : 'No projects match your current filters'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search, status, or category filters
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="text-xl">All Projects</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all your projects
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name, type, category, reference, or admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* <span className="text-sm font-medium text-muted-foreground">Status:</span> */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
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
              <div className="flex items-center gap-2">
                {/* <span className="text-sm font-medium text-muted-foreground">Category:</span> */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {projectCategoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    onEditProject(null);
                  }}
                  className="flex items-center gap-2"
                >
                  Add Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="font-semibold text-left min-w-[200px]">Project Name</TableHead>
                <TableHead className="font-semibold text-center min-w-[120px]">Type</TableHead>
                <TableHead className="font-semibold text-center min-w-[120px]">Category</TableHead>
                <TableHead className="font-semibold text-center min-w-[100px]">Priority</TableHead>
                <TableHead className="font-semibold text-center min-w-[150px]">Reference</TableHead>
                <TableHead className="font-semibold text-center min-w-[140px]">Status</TableHead>
                <TableHead className="font-semibold text-center min-w-[120px]">Deadline</TableHead>
                <TableHead className="font-semibold text-center min-w-[120px]">Created</TableHead>
                <TableHead className="font-semibold text-center min-w-[120px]">Admin</TableHead>
                <TableHead className="font-semibold text-center min-w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => {
                const isCompleted = project.status?.toLowerCase() === 'completed';
                return (
                  <TableRow
                    key={project.id}
                    className={`hover:bg-muted/30 transition-colors border-b ${isCompleted ? 'opacity-75 bg-muted/20' : ''
                      }`}
                  >
                    <TableCell className="font-medium py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2 max-w-[180px]">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <Badge variant="secondary" className="text-xs">
                        {project.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <Badge
                        variant={project.category ? "default" : "outline"}
                        className="text-xs"
                      >
                        {project.category || 'Not set'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <Badge
                        variant={
                          project.priority === 'Critical' ? 'destructive' :
                          project.priority === 'High' ? 'default' :
                          project.priority === 'Medium' ? 'secondary' :
                          project.priority === 'Low' ? 'outline' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {project.priority || 'Not set'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="text-sm">
                        {project.reference ? (
                          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                            {project.reference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <Select
                        value={project.status}
                        onValueChange={(value) => handleStatusChange(project.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {projectStatusOptions.map((status) => (
                            <SelectItem key={status} value={status} className="text-xs">
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="text-sm">
                        {project.deadline ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {format(new Date(project.deadline), 'MMM dd')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(project.deadline), 'yyyy')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="text-sm">
                        <div className="font-medium">
                          {format(new Date(project.created_at), 'MMM dd')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(project.created_at), 'yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="text-sm font-medium">
                        {project.admin_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="flex justify-center gap-1">
                        {onViewDetails && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewDetails(project)}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditProject(project)}
                          className="h-8 w-8 p-0"
                          title="Edit Project"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewComments(project)}
                          className="h-8 w-8 p-0"
                          title="View Comments"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        {onViewTasks && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewTasks(project)}
                            className="h-8 w-8 p-0"
                            title="View Tasks"
                          >
                            <CheckSquare className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};