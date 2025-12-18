import React, { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { MentionAutocompleteForEditor } from '@/features/projects/ui/MentionAutocompleteForEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project, ProjectComment } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';
import {
  useAddProjectComment,
  useUpdateCommentAcknowledgment,
  useUpdateProjectComment,
  useUpdateProject,
  useDeleteProject,
} from '@/features/admin/hooks/useAdminProjectMutations';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Send, Calendar, FileText, CheckCircle2, Trash2, Edit2, Clock, User, AlertCircle, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionAutocomplete } from '@/features/projects/ui/MentionAutocomplete';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/features/users/services/userService';
import { parseMentions, extractMentionedUserIds } from '@/shared/utils/mentionParser';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useStatusHistory } from '@/features/statusHistory/hooks/useStatusHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { MilestonesTabContent } from './MilestonesTabContent';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { HtmlContent } from '@/shared/ui/HtmlContent';
import { stripHtml } from '@/shared/utils/htmlUtils';
import { useEditor } from '@tiptap/react';

interface AdminProjectDetailsPanelProps {
  project: Project | null;
  tasks: Task[];
  open: boolean;
  onClose: () => void;
}

export const AdminProjectDetailsPanel: React.FC<AdminProjectDetailsPanelProps> = ({
  project,
  tasks,
  open,
  onClose,
}) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const editCommentEditorRef = React.useRef<Editor | null>(null);
  const commentEditorRef = React.useRef<Editor | null>(null);
  const addCommentMutation = useAddProjectComment();
  const updateAcknowledgmentMutation = useUpdateCommentAcknowledgment();
  const updateCommentMutation = useUpdateProjectComment();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const { data: vendors = [] } = useVendors();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    priority: '',
    deadline: null as Date | null,
    admin_id: '',
    vendor_id: '',
  });

  // Fetch all users for mention autocomplete and admin selection
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
  });

  // Fetch status history for the project
  const {
    data: statusHistory = [],
    isLoading: statusHistoryLoading,
    error: statusHistoryError,
  } = useStatusHistory(project?.id, 'project', !!project);

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      // Parse deadline date correctly - handle date-only strings
      let deadlineDate: Date | null = null;
      if (project.deadline) {
        const dateStr = project.deadline;
        // If it's already a date string, parse it and create date at noon UTC to avoid timezone shifts
        if (typeof dateStr === 'string') {
          // If it's in YYYY-MM-DD format or ISO format, extract date part
          const dateOnly = dateStr.split('T')[0]; // Get YYYY-MM-DD part
          const [year, month, day] = dateOnly.split('-').map(Number);
          // Create date at noon UTC to avoid timezone conversion issues
          deadlineDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        } else {
          deadlineDate = new Date(dateStr);
        }
      }
      
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || '',
        priority: project.priority || '',
        deadline: deadlineDate,
        admin_id: project.admin_id || '',
        vendor_id: project.vendor_id || '',
      });
      setIsEditDialogOpen(false);
    }
  }, [project]);

  // Group tasks by status for the Tasks tab (must be before early return)
  const tasksGroupedByStatus = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      const empty: Record<string, Task[]> = {
        'To Do': [],
        'In Progress': [],
        'Review': [],
        'Blocked': [],
        'Completed': [],
        'Other': [],
      };
      return empty;
    }
    
    const grouped: Record<string, Task[]> = {};
    const statusOrder = ['To Do', 'In Progress', 'Review', 'Blocked', 'Completed'];
    
    // Initialize groups
    statusOrder.forEach(status => {
      grouped[status] = [];
    });
    grouped['Other'] = [];
    
    // Group tasks by status
    tasks.forEach(task => {
      const status = task.status || 'Other';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['Other'].push(task);
      }
    });
    
    // Sort tasks within each group by creation date (newest first)
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : a.updated_at
            ? new Date(a.updated_at).getTime()
            : 0;
        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : b.updated_at
            ? new Date(b.updated_at).getTime()
            : 0;
        return dateB - dateA;
      });
    });
    
    return grouped;
  }, [tasks]);

  if (!project) return null;

  const resetFormToProject = () => {
    if (!project) return;
    // Parse deadline date correctly - handle date-only strings
    let deadlineDate: Date | null = null;
    if (project.deadline) {
      const dateStr = project.deadline;
      // If it's already a date string, parse it and create date at noon UTC to avoid timezone shifts
      if (typeof dateStr === 'string') {
        // If it's in YYYY-MM-DD format or ISO format, extract date part
        const dateOnly = dateStr.split('T')[0]; // Get YYYY-MM-DD part
        const [year, month, day] = dateOnly.split('-').map(Number);
        // Create date at noon UTC to avoid timezone conversion issues
        deadlineDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      } else {
        deadlineDate = new Date(dateStr);
      }
    }
    
    setFormData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || '',
      priority: project.priority || '',
      deadline: deadlineDate,
      admin_id: project.admin_id || '',
      vendor_id: project.vendor_id || '',
    });
  };

  const handleOpenEditDialog = () => {
    resetFormToProject();
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!profile) return;

    // Format deadline as date-only string (YYYY-MM-DD) or as ISO string at noon UTC to avoid timezone shifts
    let deadlineString: string | null = null;
    if (formData.deadline) {
      // Get date components from the selected date (local time)
      const year = formData.deadline.getFullYear();
      const month = formData.deadline.getMonth();
      const day = formData.deadline.getDate();
      // Create date at noon UTC to avoid timezone conversion issues when saving/loading
      const dateAtNoonUTC = new Date(Date.UTC(year, month, day, 12, 0, 0));
      deadlineString = dateAtNoonUTC.toISOString();
    }

    updateProjectMutation.mutate(
      {
        projectId: project.id,
        data: {
          name: formData.name,
          description: formData.description || null,
          status: formData.status || null,
          priority: formData.priority || null,
          deadline: deadlineString,
          admin_id: formData.admin_id || null,
          vendor_id: formData.vendor_id || null,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteProjectMutation.mutate(project.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onClose();
        // Refresh the projects list by navigating
        navigate('/admin/projects');
      },
    });
  };

  const handleCancel = () => {
    resetFormToProject();
    setIsEditDialogOpen(false);
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !profile) return;

    // Extract plain text from HTML for mention parsing
    const plainText = stripHtml(commentText);
    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    addCommentMutation.mutate(
      {
        projectId: project.id,
        message: commentText.trim(), // Store HTML
        userId: profile.id,
        userName: profile.name || 'Unknown User',
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          setCommentText('');
          commentEditorRef.current?.commands.clearContent();
        },
      }
    );
  };

  const handleStartEditComment = (comment: ProjectComment) => {
    if (!profile || comment.user_id !== profile.id) return;
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.message);
    setTimeout(() => {
      editCommentEditorRef.current?.commands.focus();
    }, 0);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveEditComment = () => {
    if (!profile || !project || !editingCommentId) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed) {
      toast.error('Comment cannot be empty');
      return;
    }

    // Extract plain text from HTML for mention parsing
    const plainText = stripHtml(trimmed);
    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    updateCommentMutation.mutate(
      {
        projectId: project.id,
        commentId: editingCommentId,
        message: trimmed, // Store HTML
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          handleCancelEditComment();
        },
      }
    );
  };

  const comments = project?.comments || [];
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleAcknowledgmentChange = (commentId: string, acknowledged: boolean) => {
    if (!profile) return;
    updateAcknowledgmentMutation.mutate({
      projectId: project.id,
      commentId,
      acknowledged,
      acknowledgedBy: profile.id,
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'on hold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'to do':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-3 sm:p-4 md:p-6">
          <SheetHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg sm:text-xl md:text-2xl truncate">{project.name}</SheetTitle>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                  {project.description ? (
                    <HtmlContent content={project.description} className="text-xs sm:text-sm" />
                  ) : (
                    <span>No description available</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenEditDialog}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-4 sm:mt-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 rounded-[14px] h-9 sm:h-10">
                <TabsTrigger value="overview" className="rounded-[14px] text-[10px] sm:text-xs md:text-sm">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-[14px] text-[10px] sm:text-xs md:text-sm">
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="milestones" className="rounded-[14px] text-[10px] sm:text-xs md:text-sm">
                  Milestones
                </TabsTrigger>
                <TabsTrigger value="status-history" className="rounded-[14px] text-[10px] sm:text-xs md:text-sm">
                  <span className="hidden sm:inline">Status History</span>
                  <span className="sm:hidden">History</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* Project Info - Editable */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Status
                </label>
              <Badge className={cn('text-xs', getStatusColor(project.status))}>
                {project.status || 'N/A'}
              </Badge>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Priority
                </label>
              <span className="font-medium">{project.priority || 'N/A'}</span>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Deadline
                </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {project.deadline
                    ? (() => {
                        // Parse deadline correctly to avoid timezone shifts
                        const dateStr = project.deadline;
                        const dateOnly = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
                        const [year, month, day] = dateOnly.split('-').map(Number);
                        const dateAtNoonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                        return format(dateAtNoonUTC, 'dd MMM yyyy');
                      })()
                    : 'No deadline'}
                </span>
              </div>
              </div>

              {/* Category */}
              {/* Admin */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Admin
                </label>
              <span className="font-medium">{project.adminName || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Vendor
              </label>
              {project.vendor ? (
                <div className="rounded-[14px] border border-border p-3 flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    {project.vendor.name}
                  </div>
                  {project.vendor.email && (
                    <span className="text-muted-foreground">Email: {project.vendor.email}</span>
                  )}
                  {project.vendor.phone && (
                    <span className="text-muted-foreground">Phone: {project.vendor.phone}</span>
                  )}
                  {project.vendor.website && (
                    <a
                      href={
                        project.vendor.website.startsWith('http')
                          ? project.vendor.website
                          : `https://${project.vendor.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline text-sm"
                    >
                      {project.vendor.website}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No vendor linked</p>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Comments</h3>

              {/* Add Comment Form */}
              <div className="space-y-2 mb-4 relative">
                <RichTextEditor
                  value={commentText}
                  onChange={setCommentText}
                  placeholder="Add a comment... Use @ to mention someone"
                  showToolbar={false}
                  onEditorReady={(editor) => {
                    commentEditorRef.current = editor;
                  }}
                />
                <MentionAutocompleteForEditor
                  users={allUsers}
                  editor={commentEditorRef.current}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="w-full bg-primary text-white hover:bg-primary/90 rounded-[14px]"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sortedComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                ) : (
                  sortedComments.map((comment: ProjectComment, index: number) => {
                    const isOwnComment = comment.user_id === profile?.id;
                    const isEditing = editingCommentId === comment.id;

                    return (
                      <div key={comment.id || index} className="flex items-start gap-2">
                        <Checkbox
                          checked={comment.acknowledged || false}
                          onCheckedChange={(checked) =>
                            handleAcknowledgmentChange(comment.id, checked === true)
                          }
                          disabled={updateAcknowledgmentMutation.isPending}
                          className="mt-1"
                        />
                        <div className="flex-1 bg-secondary rounded-lg p-2.5 min-w-0 rounded-[14px]">
                          <div className="flex items-start justify-between mb-1 gap-2">
                            <div>
                              <span className="font-medium text-sm block">{comment.user_name}</span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {comment.acknowledged && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              )}
                              {isOwnComment && !isEditing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full"
                                  onClick={() => handleStartEditComment(comment)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <RichTextEditor
                                value={editingCommentText}
                                onChange={setEditingCommentText}
                                placeholder="Edit comment... Use @ to mention someone"
                                showToolbar={false}
                                onEditorReady={(editor) => {
                                  editCommentEditorRef.current = editor;
                                }}
                              />
                              <MentionAutocompleteForEditor
                                users={allUsers}
                                editor={editCommentEditorRef.current}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-[14px]"
                                  onClick={handleCancelEditComment}
                                  disabled={updateCommentMutation.isPending}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-primary text-white hover:bg-primary/90 rounded-[14px]"
                                  onClick={handleSaveEditComment}
                                  disabled={updateCommentMutation.isPending}
                                >
                                  {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm">
                              <HtmlContent content={comment.message} className="text-sm" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
              </TabsContent>

              <TabsContent value="tasks" className="mt-4 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    All Tasks ({tasks.length})
                  </h3>
                  
                  {tasks.length === 0 ? (
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground text-center">
                          No tasks assigned to this project
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {['To Do', 'In Progress', 'Review', 'Blocked', 'Completed', 'Other'].map((status) => {
                        const statusTasks = tasksGroupedByStatus[status] || [];
                        if (statusTasks.length === 0) return null;
                        
                        return (
                          <div key={status}>
                            <div className="flex items-center gap-2 mb-3">
                              <h4 className="text-base font-semibold">{status}</h4>
                              <Badge variant="outline" className="text-xs">
                                {statusTasks.length}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {statusTasks.map((task) => (
                                <Card key={task.id} className="border">
                                  <CardContent className="p-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <h4 className="font-medium text-sm">{task.name}</h4>
                                        <Badge className={cn('text-xs px-1.5 py-0', getTaskStatusColor(task.status))}>
                                          {task.status || 'N/A'}
                                        </Badge>
                                        {task.priority && (
                                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                                            {task.priority}
                                          </Badge>
                                        )}
                                        {task.category && (
                                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                                            {task.category}
                                          </Badge>
                                        )}
                                      </div>
                                      {task.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                          {stripHtml(task.description)}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        {task.deadline && (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Due: {format(new Date(task.deadline), 'dd MMM yyyy')}</span>
                                          </div>
                                        )}
                                        {task.assignees && task.assignees.length > 0 && (
                                          <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span>
                                              {task.assignees.map((a) => a.users?.name || 'Unknown').join(', ')}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="milestones" className="mt-4">
                <MilestonesTabContent projectId={project.id} />
              </TabsContent>

              <TabsContent value="status-history" className="mt-4">
                {statusHistoryLoading ? (
                  <Card>
                    <CardContent className="p-6 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : statusHistoryError ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to load status history</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : statusHistory.length === 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center text-muted-foreground py-6">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No status history available</p>
                        <p className="text-sm">Status changes will appear here once they occur</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {statusHistory.map((item, index) => (
                          <div key={item.id} className="flex items-start gap-3">
                            {/* Timeline dot */}
                            <div className="relative">
                              <div className="w-3 h-3 bg-primary rounded-full mt-1.5" />
                              {index < statusHistory.length - 1 && (
                                <div className="absolute top-3 left-1.5 w-px h-8 bg-border" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary">{item.status}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {item.updated_at
                                    ? format(new Date(item.updated_at), 'MMM dd, yyyy HH:mm')
                                    : 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{item.user_name || 'Unknown User'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Project Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            resetFormToProject();
            setIsEditDialogOpen(true);
          } else {
            handleCancel();
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-[720px] max-h-[90vh] rounded-[14px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Project</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update the project information. Changes apply immediately after saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">
                Project Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Project Name"
                className="text-sm h-9 sm:h-10"
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Describe the project..."
                className="text-sm"
                showToolbar={false}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">
                  Status
                </label>
                <Select
                  value={formData.status || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px] text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Client Approval">Client Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">
                  Priority
                </label>
                <Select
                  value={formData.priority || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px] text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">
                  Deadline
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal rounded-[14px] text-sm h-9 sm:h-10',
                        !formData.deadline && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        {formData.deadline ? format(formData.deadline, 'PPP') : 'Pick a date'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-[14px]" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.deadline || undefined}
                      onSelect={(date) => setFormData({ ...formData, deadline: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">
                  Admin
                </label>
                <Select
                  value={formData.admin_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, admin_id: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px] text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Select admin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allUsers
                      .filter((user) => user.role === 'Admin')
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">
                  Vendor
                </label>
                <Select
                  value={formData.vendor_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vendor_id: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px] text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-2 sm:pt-0">
            <Button variant="outline" onClick={handleCancel} className="rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProjectMutation.isPending || !formData.name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10"
            >
              {updateProjectMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[14px] max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-[14px] w-full sm:w-auto text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-[14px] w-full sm:w-auto text-sm"
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

