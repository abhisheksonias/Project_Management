import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Task, TaskComment } from '@/features/tasks/services/taskService';
import {
  useAddTaskComment,
  useUpdateTaskCommentAcknowledgment,
  useUpdateTaskComment,
} from '@/features/tasks/hooks/useTaskComments';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/features/users/services/userService';
import { MentionAutocompleteForEditor } from '@/features/projects/ui/MentionAutocompleteForEditor';
import { parseMentions, extractMentionedUserIds } from '@/shared/utils/mentionParser';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { stripHtml } from '@/shared/utils/htmlUtils';
import { useEditor, Editor } from '@tiptap/react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  Folder,
  Send,
  CheckCircle2,
  Trash2,
  Edit2,
  User,
  ClipboardList,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteTask, useUpdateTask } from '@/features/admin/hooks/useAdminTaskMutations';
import {
  CreateTaskDialog,
  NewTaskFormState,
  createDefaultNewTaskFormState,
} from './CreateTaskDialog';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { StatusHistory } from '@/components/ui/status-history';
import { useAdminTaskDetails } from '@/features/admin/hooks/useAdminTaskDetails';
import { useAllMilestones } from '@/features/milestones/hooks/useMilestones';
import { useTaskWorklogs } from '@/features/admin/hooks/useTaskWorklogs';
import { HtmlContent } from '@/shared/ui/HtmlContent';

const STATUS_OPTIONS = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Review'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const CATEGORY_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
];

interface AdminTaskDetailsPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; department?: string | null }>;
}

export const AdminTaskDetailsPanel: React.FC<AdminTaskDetailsPanelProps> = ({
  task,
  open,
  onClose,
  projects,
  users,
}) => {
  const { profile } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const commentEditorRef = useRef<Editor | null>(null);
  const editCommentEditorRef = useRef<Editor | null>(null);
  const addCommentMutation = useAddTaskComment();
  const updateAcknowledgmentMutation = useUpdateTaskCommentAcknowledgment();
  const updateCommentMutation = useUpdateTaskComment();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  type TaskPanelTab = 'details' | 'status' | 'logs';
  const [activeTab, setActiveTab] = useState<TaskPanelTab>('details');
  const [logsUserFilter, setLogsUserFilter] = useState<'all' | string>('all');
  const taskId = task?.id;
  const {
    data: hydratedTask,
    isFetching: isTaskRefreshing,
  } = useAdminTaskDetails(taskId, { enabled: open, initialData: task });
  const activeTask = hydratedTask ?? task;
  const {
    data: taskWorklogs = [],
    isLoading: taskWorklogsLoading,
  } = useTaskWorklogs(activeTask?.id ?? null);
  useEffect(() => {
    setLogsUserFilter('all');
  }, [activeTask?.id]);
  const handleCloseEditDialog = () => {
    if (activeTask) {
      setEditForm(buildFormStateFromTask(activeTask));
    }
    setIsEditDialogOpen(false);
  };


  const buildFormStateFromTask = (currentTask: Task): NewTaskFormState => {
    // Get assignees from task_assignees table
    const assignedUserIds: string[] = 
      currentTask.assignees && currentTask.assignees.length > 0
        ? currentTask.assignees.map((a) => a.user_id)
        : [];

    return {
      name: currentTask.name || '',
      description: currentTask.description || '',
      status: currentTask.status || 'To Do',
      type: currentTask.type || '',
      priority: currentTask.priority || '',
      project_id: currentTask.project_id || 'none',
      category: currentTask.category || '',
      estimate_hours: currentTask.estimate_hours ? String(currentTask.estimate_hours) : '',
      deadline: currentTask.deadline ? new Date(currentTask.deadline) : null,
      assigned_user_ids: assignedUserIds,
      milestone_id: (currentTask as any).milestone_id || 'none',
    };
  };

  const [editForm, setEditForm] = useState<NewTaskFormState>(() =>
    createDefaultNewTaskFormState()
  );

  // Fetch all users for mention autocomplete
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
  });
  
  // Fetch all milestones for milestone dropdown
  const { data: allMilestones = [] } = useAllMilestones();
  const milestonesForSelect = useMemo(
    () => allMilestones.map((m) => ({
      id: m.id,
      name: m.name,
      project_id: m.project_id,
    })),
    [allMilestones]
  );

  const logUserOptions = useMemo(() => {
    const unique = new Map<string, string>();
    (taskWorklogs || []).forEach((log) => {
      if (log.user?.id) {
        unique.set(log.user.id, log.user.name || 'Unknown User');
      }
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [taskWorklogs]);

  const filteredLogs = useMemo(() => {
    if (logsUserFilter === 'all') {
      return taskWorklogs || [];
    }
    return (taskWorklogs || []).filter((log) => log.user?.id === logsUserFilter);
  }, [taskWorklogs, logsUserFilter]);

  const comments = useMemo(() => {
    if (!activeTask?.comment) return [];
    try {
      const parsed =
        typeof activeTask.comment === 'string' ? JSON.parse(activeTask.comment) : activeTask.comment;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [activeTask?.comment]);

  const sortedComments = useMemo(() => {
    return [...comments].sort(
      (a: TaskComment, b: TaskComment) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [comments]);

  useEffect(() => {
    if (activeTask) {
      setEditForm(buildFormStateFromTask(activeTask));
    }
  }, [activeTask]);

  useEffect(() => {
    if (taskId) {
      setActiveTab('details');
    }
  }, [taskId]);

  const assignedUserDisplayName = useMemo(() => {
    // Get assignees from task_assignees table
    if (!activeTask?.assignees || activeTask.assignees.length === 0) return null;
    
    const names = activeTask.assignees
      .map((assignee) => {
        // Try to get name from assignees first
        if (assignee.users?.name) return assignee.users.name;
        // Fallback to users array
        return users.find((user) => user.id === assignee.user_id)?.name || assignee.user_id;
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : null;
  }, [activeTask?.assignees, users]);

  if (!activeTask) return null;

  const handleAddComment = () => {
    if (!commentText.trim() || !profile || !activeTask) return;

    // Extract plain text from HTML for mention parsing
    const plainText = stripHtml(commentText);
    const userMap = new Map(allUsers.map((user) => [user.id, { id: user.id, name: user.name }]));
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    addCommentMutation.mutate(
      {
        taskId: activeTask.id,
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

  const handleAcknowledgmentChange = (commentId: string, acknowledged: boolean) => {
    if (!profile || !activeTask) return;
    updateAcknowledgmentMutation.mutate({
      taskId: activeTask.id,
      commentId,
      acknowledged,
      acknowledgedBy: profile.id,
    });
  };

  const handleStartEditComment = (comment: TaskComment) => {
    if (!profile || !activeTask || comment.user_id !== profile.id) return;
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
    if (!profile || !activeTask || !editingCommentId) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed) {
      return;
    }

    // Extract plain text from HTML for mention parsing
    const plainText = stripHtml(trimmed);
    const userMap = new Map(allUsers.map((user) => [user.id, { id: user.id, name: user.name }]));
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    updateCommentMutation.mutate(
      {
        taskId: activeTask.id,
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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Blocked':
        return 'bg-red-100 text-red-800';
      case 'Review':
        return 'bg-purple-100 text-purple-800';
      case 'To Do':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteTask = () => {
    deleteTaskMutation.mutate(activeTask.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        onClose();
      },
    });
  };

  const handleSaveTask = () => {
    if (!profile) return;

    const payload = {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      status: editForm.status || 'To Do',
      type: editForm.type.trim() || null,
      priority: editForm.priority || null,
      project_id: editForm.project_id && editForm.project_id !== 'none' ? editForm.project_id : null,
      category: editForm.category || null,
      estimate_hours: editForm.estimate_hours
        ? Number(editForm.estimate_hours)
        : null,
      deadline: editForm.deadline ? editForm.deadline.toISOString() : null,
      assigned_user_ids: editForm.assigned_user_ids || [],
      milestone_id: editForm.milestone_id && editForm.milestone_id !== 'none' ? editForm.milestone_id : null,
    };

    if (!payload.name || !payload.type) {
      return;
    }

    updateTaskMutation.mutate(
      {
        taskId: activeTask.id,
        data: payload,
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="flex h-full w-full flex-col overflow-hidden sm:max-w-2xl p-3 sm:p-4 md:p-6">
          <SheetHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg sm:text-xl md:text-2xl truncate">{activeTask.name}</SheetTitle>
                <div className="mt-1 sm:mt-2">
                  {activeTask.description && (
                    <div className="mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="h-auto p-0 text-xs sm:text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {isDescriptionExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Hide Description</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Show Description</span>
                          </>
                        )}
                      </Button>
                      {isDescriptionExpanded && (
                        <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
                          <HtmlContent content={activeTask.description} className="text-xs sm:text-sm" />
                        </div>
                      )}
                    </div>
                  )}
                  {isTaskRefreshing && (
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Syncing
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditForm(buildFormStateFromTask(activeTask));
                    setIsEditDialogOpen(true);
                  }}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9"
                  disabled={deleteTaskMutation.isPending}
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TaskPanelTab)}
            className="mt-4 sm:mt-6 flex h-full flex-col"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-[14px] h-9 sm:h-10">
              <TabsTrigger value="details" className="rounded-[14px] text-[11px] sm:text-xs md:text-sm">
                Details
              </TabsTrigger>
              <TabsTrigger value="status" className="rounded-[14px] text-[11px] sm:text-xs md:text-sm">
                Status Timeline
              </TabsTrigger>
              <TabsTrigger value="logs" className="rounded-[14px] text-[11px] sm:text-xs md:text-sm">
                Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="details"
              className="mt-4 flex-1 overflow-y-auto pr-1"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={cn('text-xs', getStatusColor(activeTask.status))}>
                      {activeTask.status || 'To Do'}
                    </Badge>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Priority:</span>
                    {activeTask.priority ? (
                      <Badge className={cn('text-xs', getPriorityColor(activeTask.priority))}>
                        {activeTask.priority}
                      </Badge>
                    ) : (
                      <span className="font-medium">-</span>
                    )}
                  </div>
                  {activeTask.type && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium capitalize">{activeTask.type}</span>
                      </div>
                    </>
                  )}
                  {activeTask.category && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium capitalize">{activeTask.category}</span>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {activeTask.projects?.name && (
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Project</p>
                        <p className="text-sm font-medium">{activeTask.projects.name}</p>
                      </div>
                    </div>
                  )}

                  {activeTask.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Deadline</p>
                        <p className="text-sm font-medium">
                          {format(new Date(activeTask.deadline), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTask.estimate_hours !== undefined && activeTask.estimate_hours !== null && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Estimate</p>
                        <p className="text-sm font-medium">{activeTask.estimate_hours} hours</p>
                      </div>
                    </div>
                  )}

                  {activeTask.assignees && activeTask.assignees.length > 0 && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Assigned User{activeTask.assignees.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm font-medium">
                          {assignedUserDisplayName || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTask.type && (
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="text-sm font-medium">{activeTask.type}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="mb-4 text-lg font-semibold">Comments</h3>

                  <div className="relative mb-4 space-y-2">
                    <RichTextEditor
                      value={commentText}
                      onChange={setCommentText}
                      placeholder="Add a comment... Use @ to mention someone"
                      showToolbar={false}
                      className="text-sm"
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
                      className="w-full rounded-[14px] bg-primary text-white hover:bg-primary/90"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {sortedComments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    ) : (
                      sortedComments.map((comment: TaskComment, index: number) => {
                        const isOwnComment = profile?.id === comment.user_id;
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
                            <div className="min-w-0 flex-1 rounded-[14px] bg-secondary p-2.5">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">{comment.user_name}</span>
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
                                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                                    {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                                  </span>
                                </div>
                              </div>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <RichTextEditor
                                    value={editingCommentText}
                                    onChange={setEditingCommentText}
                                    placeholder="Edit comment... Use @ to mention someone"
                                    showToolbar={false}
                                    className="text-sm"
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
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEditComment}
                                      className="rounded-[8px]"
                                      disabled={updateCommentMutation.isPending}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={handleSaveEditComment}
                                      disabled={!editingCommentText.trim() || updateCommentMutation.isPending}
                                      className="rounded-[8px] bg-primary text-white hover:bg-primary/90"
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
              </div>
            </TabsContent>

            <TabsContent
              value="status"
              className="mt-4 flex-1 overflow-y-auto pr-1"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Status updates for this task</span>
                  {isTaskRefreshing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </div>
                <StatusHistory entityId={activeTask.id} entityType="task" title="Status Timeline" />
              </div>
            </TabsContent>

            <TabsContent
              value="logs"
              className="mt-4 flex-1 overflow-y-auto pr-1"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Worklogs</h3>
                    <p className="text-sm text-muted-foreground">
                      All-time worklogs recorded for this task
                    </p>
                  </div>
                  <Select
                    value={logsUserFilter}
                    onValueChange={(value) => setLogsUserFilter(value as typeof logsUserFilter)}
                  >
                    <SelectTrigger className="w-[200px] rounded-[14px]">
                      <SelectValue placeholder="Filter by user" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[14px]">
                      <SelectItem value="all">All users</SelectItem>
                      {logUserOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {taskWorklogsLoading ? (
                  <div className="flex items-center gap-2 rounded-[14px] border p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading logs...
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed p-6 text-center text-muted-foreground">
                    No logs found for this task.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="rounded-[14px] border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{log.user?.name || 'Unknown user'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                            </p>
                          </div>
                          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                            {log.hours}
                          </Badge>
                        </div>
                        
                        {log.note && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <HtmlContent content={log.note} className="text-sm" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <CreateTaskDialog
        open={isEditDialogOpen}
        data={editForm}
        projects={projects}
        users={users}
        categoryOptions={CATEGORY_OPTIONS}
        milestones={milestonesForSelect}
        isSubmitting={updateTaskMutation.isPending}
        onChange={(changes) =>
          setEditForm((prev) => ({
            ...prev,
            ...changes,
          }))
        }
        onSubmit={handleSaveTask}
        title="Edit Task"
        description="Update the task information and save your changes."
        submitLabel="Save Changes"
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          } else {
            setIsEditDialogOpen(true);
          }
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[14px] max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete &quot;{activeTask.name}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-[14px] w-full sm:w-auto text-sm" disabled={deleteTaskMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-700 rounded-[14px] w-full sm:w-auto text-sm"
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


