import React, { useState, useEffect } from 'react';
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
import { Send, Calendar, FileText, CheckCircle2, Trash2, Edit2, Clock, User, AlertCircle } from 'lucide-react';
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

const PROJECT_CATEGORY_OPTIONS = [
  { value: 'One-time', label: 'One-time' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Hourly', label: 'Hourly' },
];

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
  const editCommentTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const addCommentMutation = useAddProjectComment();
  const updateAcknowledgmentMutation = useUpdateCommentAcknowledgment();
  const updateCommentMutation = useUpdateProjectComment();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    type: '',
    priority: '',
    deadline: null as Date | null,
    category: '',
    reference: '',
    admin_id: '',
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
        type: project.type || '',
        priority: project.priority || '',
        deadline: deadlineDate,
        category: project.category || '',
        reference: project.reference || '',
        admin_id: project.admin_id || '',
      });
      setIsEditDialogOpen(false);
    }
  }, [project]);

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
      type: project.type || '',
      priority: project.priority || '',
      deadline: deadlineDate,
      category: project.category || '',
      reference: project.reference || '',
      admin_id: project.admin_id || '',
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
          type: formData.type,
          priority: formData.priority || null,
          deadline: deadlineString,
          category: formData.category || null,
          reference: formData.reference || null,
          admin_id: formData.admin_id || null,
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

    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(commentText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    addCommentMutation.mutate(
      {
        projectId: project.id,
        message: commentText.trim(),
        userId: profile.id,
        userName: profile.name || 'Unknown User',
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          setCommentText('');
        },
      }
    );
  };

  const handleStartEditComment = (comment: ProjectComment) => {
    if (!profile || comment.user_id !== profile.id) return;
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.message);
    setTimeout(() => {
      editCommentTextareaRef.current?.focus();
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

    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(trimmed, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    updateCommentMutation.mutate(
      {
        projectId: project.id,
        commentId: editingCommentId,
        message: trimmed,
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          handleCancelEditComment();
        },
      }
    );
  };

  const comments = project.comments || [];
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Filter out completed tasks and sort by latest first
  const sortedTasks = [...tasks]
    .filter((task) => task.status?.toLowerCase() !== 'completed')
    .sort((a, b) => {
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
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl">{project.name}</SheetTitle>
                <SheetDescription className="mt-2">
                  {project.description || 'No description available'}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenEditDialog}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-[14px]">
                <TabsTrigger value="overview" className="rounded-[14px]">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="status-history" className="rounded-[14px]">
                  Status History
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

              {/* Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Type *
                </label>
              <span className="font-medium">{project.type}</span>
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
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Category
                </label>
              <span className="font-medium">
                {(() => {
                  if (!project.category) return 'N/A';
                  const option = PROJECT_CATEGORY_OPTIONS.find(
                    (opt) => opt.value === project.category
                  );
                  return option?.label || project.category;
                })()}
              </span>
              </div>

              {/* Reference */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Reference
                </label>
              <span className="font-medium">{project.reference || 'N/A'}</span>
              </div>

              {/* Admin */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Admin
                </label>
              <span className="font-medium">{project.adminName || 'N/A'}</span>
              </div>
            </div>

            <Separator />

            {/* Tasks Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tasks ({sortedTasks.length})
              </h3>
              {sortedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks assigned</p>
              ) : (
                <div className="space-y-1.5">
                  {sortedTasks.map((task) => (
                    <Card key={task.id} className="border">
                      <CardContent className="p-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h4 className="font-medium text-sm">{task.name}</h4>
                            <Badge className={cn('text-xs px-1.5 py-0', getTaskStatusColor(task.status))}>
                              {task.status}
                            </Badge>
                            {task.priority && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {task.priority}
                              </Badge>
                            )}
                            {task.deadline && (
                              <span className="text-xs text-muted-foreground">
                                Due: {format(new Date(task.deadline), 'dd MMM')}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Comments</h3>

              {/* Add Comment Form */}
              <div className="space-y-2 mb-4 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Add a comment... Use @ to mention someone"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="resize-none rounded-[14px]"
                />
                <MentionAutocomplete
                  users={allUsers}
                  text={commentText}
                  onTextChange={setCommentText}
                  onMentionSelect={() => {}}
                  textareaRef={textareaRef}
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
                              <Textarea
                                ref={editCommentTextareaRef}
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={3}
                                className="resize-none rounded-[14px]"
                              />
                              <MentionAutocomplete
                                users={allUsers}
                                text={editingCommentText}
                                onTextChange={setEditingCommentText}
                                onMentionSelect={() => {}}
                                textareaRef={editCommentTextareaRef}
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
                            <p className="text-sm">{comment.message}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
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
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project information. Changes apply immediately after saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Project Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Project Name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the project..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Status
                </label>
                <Select
                  value={formData.status || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px]">
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
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Type *
                </label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="Enter project type"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Priority
                </label>
                <Select
                  value={formData.priority || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px]">
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
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Deadline
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal rounded-[14px]',
                        !formData.deadline && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.deadline ? format(formData.deadline, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-[14px]">
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
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Category
                </label>
                <Select
                  value={formData.category || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {PROJECT_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Reference
                </label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Direct, B2B (Client Name)"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Admin
                </label>
                <Select
                  value={formData.admin_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, admin_id: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="rounded-[14px]">
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
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} className="rounded-[14px]">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProjectMutation.isPending || !formData.name.trim() || !formData.type}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px]"
            >
              {updateProjectMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[14px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-[14px]"
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

