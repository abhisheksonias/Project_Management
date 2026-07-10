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
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Task, TaskComment } from '../services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { useAddTaskComment, useUpdateTaskCommentAcknowledgment, useUpdateTaskComment } from '../hooks/useTaskComments';
import { format } from 'date-fns';
import { Calendar, Clock, Folder, Send, CheckCircle2, Edit2, ChevronDown, ChevronUp, Pencil, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionAutocompleteForEditor } from '@/features/projects/ui/MentionAutocompleteForEditor';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/features/users/services/userService';
import { parseMentions, extractMentionedUserIds } from '@/shared/utils/mentionParser';
import { HtmlContent } from '@/shared/ui/HtmlContent';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { stripHtml } from '@/shared/utils/htmlUtils';
import { uploadTaskCommentImage } from '@/shared/utils/editorImageUpload';
import { useEditor, Editor } from '@tiptap/react';
import {
  CreateTaskDialog,
  NewTaskFormState,
  createDefaultNewTaskFormState,
} from '@/features/admin/ui/CreateTaskDialog';
import { useUpdateTask } from '@/features/admin/hooks/useAdminTaskMutations';
import { TaskTimerControls } from '@/features/task-tracker/ui/TaskTimerControls';

const CATEGORY_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
];

interface TaskDetailsPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; department?: string | null }>;
  milestones: Array<{ id: string; name: string; project_id: string; sort_order?: number | null }>;
  activeTaskId?: string;
  elapsedLabel?: string;
  onStartTimer?: (task: Task) => void;
  onStopTimer?: () => void;
}

const buildFormStateFromTask = (currentTask: Task): NewTaskFormState => {
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
    milestone_id: currentTask.milestone_id || 'none',
  };
};

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  task,
  open,
  onClose,
  projects,
  users,
  milestones,
  activeTaskId,
  elapsedLabel,
  onStartTimer,
  onStopTimer,
}) => {
  const { profile } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<NewTaskFormState>(() => createDefaultNewTaskFormState());
  const commentEditorRef = React.useRef<Editor | null>(null);
  const editCommentEditorRef = React.useRef<Editor | null>(null);
  const addCommentMutation = useAddTaskComment();
  const updateAcknowledgmentMutation = useUpdateTaskCommentAcknowledgment();
  const updateCommentMutation = useUpdateTaskComment();
  const updateTaskMutation = useUpdateTask();

  // Fetch all users for mention autocomplete
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
  });

  // Parse comments from task.comment (JSON field) - must be before conditional return
  const comments = React.useMemo(() => {
    if (!task?.comment) return [];
    try {
      const parsed = typeof task.comment === 'string' 
        ? JSON.parse(task.comment) 
        : task.comment;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [task?.comment]);

  const sortedComments = React.useMemo(() => {
    return [...comments].sort(
      (a: TaskComment, b: TaskComment) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [comments]);

  useEffect(() => {
    if (task) {
      setEditForm(buildFormStateFromTask(task));
    }
  }, [task]);

  const assignedUserDisplayName = useMemo(() => {
    if (!task?.assignees || task.assignees.length === 0) return null;

    const names = task.assignees
      .map((assignee) => {
        if (assignee.users?.name) return assignee.users.name;
        return users.find((user) => user.id === assignee.user_id)?.name || assignee.user_id;
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : null;
  }, [task?.assignees, users]);

  if (!task) return null;

  const hasCommentContent = (html: string) => {
    const trimmed = html.trim();
    if (!trimmed || trimmed === '<p></p>') return false;
    if (stripHtml(html).trim()) return true;
    return /<img[\s>]/i.test(trimmed);
  };

  const uploadCommentImage = (file: File) =>
    uploadTaskCommentImage(file, task.id, task.project_id);

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
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const handleAddComment = () => {
    if (!hasCommentContent(commentText) || !profile || !task) return;

    // Extract plain text from HTML for mention parsing
    const plainText = stripHtml(commentText);
    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    addCommentMutation.mutate(
      {
        taskId: task.id,
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
    if (!profile || !task) return;
    updateAcknowledgmentMutation.mutate({
      taskId: task.id,
      commentId,
      acknowledged,
      acknowledgedBy: profile.id,
    });
  };

  const handleStartEditComment = (comment: TaskComment) => {
    if (!profile || !task || comment.user_id !== profile.id) return;
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
    if (!profile || !task || !editingCommentId) return;
    const trimmed = editingCommentText.trim();
    if (!hasCommentContent(trimmed)) {
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
        taskId: task.id,
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

  const handleCloseEditDialog = () => {
    if (task) {
      setEditForm(buildFormStateFromTask(task));
    }
    setIsEditDialogOpen(false);
  };

  const handleSaveTask = () => {
    if (!profile || !task) return;

    const payload = {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      status: editForm.status || 'To Do',
      type: editForm.type.trim() || null,
      priority: editForm.priority || null,
      project_id: editForm.project_id && editForm.project_id !== 'none' ? editForm.project_id : null,
      category: editForm.category || null,
      estimate_hours: editForm.estimate_hours ? Number(editForm.estimate_hours) : null,
      deadline: editForm.deadline ? editForm.deadline.toISOString() : null,
      assigned_user_ids: editForm.assigned_user_ids || [],
      milestone_id:
        editForm.milestone_id && editForm.milestone_id !== 'none' ? editForm.milestone_id : null,
    };

    if (
      !payload.name ||
      !payload.type ||
      !payload.project_id ||
      !payload.deadline ||
      !payload.assigned_user_ids?.length
    ) {
      return;
    }

    updateTaskMutation.mutate(
      { taskId: task.id, data: payload },
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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto pb-14">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-lg sm:text-xl md:text-2xl flex-1">{task.name}</SheetTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-[14px] shrink-0 text-xs sm:text-sm h-8"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          {task.description && (
            <div className="mt-2">
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
                  <HtmlContent content={task.description} className="text-xs sm:text-sm" />
                </div>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
          {/* Task Info - Compact */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={cn('text-[10px] sm:text-xs', getStatusColor(task.status))}>
                {task.status || 'To Do'}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-3 sm:h-4" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-muted-foreground">Priority:</span>
              {task.priority ? (
                <Badge className={cn('text-[10px] sm:text-xs', getPriorityColor(task.priority))}>
                  {task.priority}
                </Badge>
              ) : (
                <span className="font-medium">-</span>
              )}
            </div>
            {task.type && (
              <>
                <Separator orientation="vertical" className="h-3 sm:h-4" />
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{task.type}</span>
                </div>
              </>
            )}
            {task.category && (
              <>
                <Separator orientation="vertical" className="h-3 sm:h-4" />
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium capitalize">{task.category}</span>
                </div>
              </>
            )}
          </div>

          {onStartTimer && onStopTimer && (
            <div>
              <TaskTimerControls
                isActive={activeTaskId === task.id}
                elapsedLabel={activeTaskId === task.id ? elapsedLabel : undefined}
                onStart={() => onStartTimer(task)}
                onStop={onStopTimer}
              />
            </div>
          )}

          <Separator />

          {/* Additional Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {task.projects?.name && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Folder className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Project</p>
                  <p className="text-xs sm:text-sm font-medium">{task.projects.name}</p>
                </div>
              </div>
            )}

            {assignedUserDisplayName && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Assigned to</p>
                  <p className="text-xs sm:text-sm font-medium">{assignedUserDisplayName}</p>
                </div>
              </div>
            )}

            {task.deadline && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Deadline</p>
                  <p className="text-xs sm:text-sm font-medium">
                    {format(new Date(task.deadline), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}

            {task.estimate_hours && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Estimate</p>
                  <p className="text-xs sm:text-sm font-medium">{task.estimate_hours} hours</p>
                </div>
              </div>
            )}

            {task.created_at && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Created</p>
                  <p className="text-xs sm:text-sm font-medium">
                    {format(new Date(task.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Comments Section */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Comments</h3>
            
            {/* Add Comment Form */}
            <div className="space-y-2 mb-3 sm:mb-4 relative">
              <RichTextEditor
                value={commentText}
                onChange={setCommentText}
                placeholder="Add a comment... @ to mention, paste or drag images"
                showToolbar={false}
                className="text-sm"
                enableImages
                onUploadImage={uploadCommentImage}
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
                disabled={!hasCommentContent(commentText) || addCommentMutation.isPending}
                className="w-full bg-primary text-white hover:bg-primary/90 text-sm h-9 sm:h-10"
              >
                <Send className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-2 pb-10 pr-1">
              {sortedComments.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground">No comments yet</p>
              ) : (
                sortedComments.map((comment: TaskComment, index: number) => {
                  const isOwnComment = profile?.id === comment.user_id;
                  const isEditing = editingCommentId === comment.id;
                  return (
                    <div key={comment.id || index} className="flex items-start gap-1.5 sm:gap-2">
                      <div className="flex-1 bg-secondary rounded-lg p-2 sm:p-2.5 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-1.5 sm:gap-2">
                          <span className="font-medium text-xs sm:text-sm">{comment.user_name}</span>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {comment.acknowledged && (
                              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600" />
                            )}
                            {isOwnComment && !isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full"
                                onClick={() => handleStartEditComment(comment)}
                              >
                                <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </Button>
                            )}
                            <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <RichTextEditor
                              value={editingCommentText}
                              onChange={setEditingCommentText}
                              placeholder="Edit comment... @ to mention, paste or drag images"
                              showToolbar={false}
                              className="text-sm"
                              enableImages
                              onUploadImage={uploadCommentImage}
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
                                className="rounded-[8px] text-xs sm:text-sm"
                                disabled={updateCommentMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveEditComment}
                                disabled={!hasCommentContent(editingCommentText) || updateCommentMutation.isPending}
                                className="rounded-[8px] bg-primary text-white hover:bg-primary/90 text-xs sm:text-sm"
                              >
                                {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm">
                            <HtmlContent content={comment.message} className="text-xs sm:text-sm" />
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
      </SheetContent>
    </Sheet>

    <CreateTaskDialog
      open={isEditDialogOpen}
      data={editForm}
      projects={projects}
      users={users}
      categoryOptions={CATEGORY_OPTIONS}
      milestones={milestones}
      isSubmitting={updateTaskMutation.isPending}
      onOpenChange={(dialogOpen) => {
        if (!dialogOpen) {
          handleCloseEditDialog();
        } else {
          setIsEditDialogOpen(true);
        }
      }}
      onChange={(change) =>
        setEditForm((prev) => ({
          ...prev,
          ...change,
        }))
      }
      onSubmit={handleSaveTask}
      title="Edit Task"
      description="Update task details. Fields marked with * are required."
      submitLabel="Save Changes"
    />
    </>
  );
};

