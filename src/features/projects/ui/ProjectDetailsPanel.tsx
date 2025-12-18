import React, { useState } from 'react';
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
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { MentionAutocompleteForEditor } from './MentionAutocompleteForEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Project, ProjectComment } from '@/features/projects/services/projectService';
import { Task } from '@/features/tasks/services/taskService';
import { useAddProjectComment, useUpdateCommentAcknowledgment, useUpdateProjectComment } from '@/features/dashboard/hooks/useProjectMutations';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Send, Calendar, User, FileText, CheckCircle2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionAutocomplete } from './MentionAutocomplete';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/features/users/services/userService';
import { parseMentions, extractMentionedUserIds } from '@/shared/utils/mentionParser';
import { HtmlContent } from '@/shared/ui/HtmlContent';
import { stripHtml } from '@/shared/utils/htmlUtils';
import { useEditor, Editor } from '@tiptap/react';

interface ProjectDetailsPanelProps {
  project: Project | null;
  tasks: Task[];
  open: boolean;
  onClose: () => void;
}

export const ProjectDetailsPanel: React.FC<ProjectDetailsPanelProps> = ({
  project,
  tasks,
  open,
  onClose,
}) => {
  const { profile } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const commentEditorRef = React.useRef<Editor | null>(null);
  const editCommentEditorRef = React.useRef<Editor | null>(null);
  const addCommentMutation = useAddProjectComment();
  const updateAcknowledgmentMutation = useUpdateCommentAcknowledgment();
  const updateCommentMutation = useUpdateProjectComment();

  // Fetch all users for mention autocomplete
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
  });

  if (!project) return null;

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

  const handleMentionSelect = (userId: string, userName: string) => {
    // Mention is already inserted by MentionAutocomplete
    // This is just for tracking if needed
  };

  const comments = project.comments || [];
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.created_at 
      ? new Date(a.created_at).getTime() 
      : (a.updated_at ? new Date(a.updated_at).getTime() : 0);
    const dateB = b.created_at 
      ? new Date(b.created_at).getTime() 
      : (b.updated_at ? new Date(b.updated_at).getTime() : 0);
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg sm:text-xl md:text-2xl">{project.name}</SheetTitle>
          {project.description && (
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
                  <HtmlContent content={project.description} className="text-xs sm:text-sm" />
                </div>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
          {/* Project Info - Compact */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={cn('text-[10px] sm:text-xs', getStatusColor(project.status))}>
                {project.status || 'N/A'}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-3 sm:h-4" />
            {project.priority && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-muted-foreground">Priority:</span>
                <span className="font-medium">{project.priority}</span>
              </div>
            )}
            {project.deadline && (
              <>
                <Separator orientation="vertical" className="h-3 sm:h-4" />
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(project.deadline), 'dd MMM yyyy')}
                  </span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Tasks Section - Compact */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Tasks ({sortedTasks.length})
            </h3>
            {sortedTasks.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">No tasks assigned</p>
            ) : (
              <div className="space-y-1.5">
                {sortedTasks.map((task) => (
                  <Card key={task.id} className="border">
                    <CardContent className="p-2 sm:p-2.5">
                      <div className="flex-1 min-w-0">
                        {/* First row: Name, Status, Priority, Deadline */}
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mb-1">
                          <h4 className="font-medium text-xs sm:text-sm">{task.name}</h4>
                          <Badge className={cn('text-[10px] sm:text-xs px-1 sm:px-1.5 py-0', getTaskStatusColor(task.status))}>
                            {task.status}
                          </Badge>
                          {task.priority && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0">
                              {task.priority}
                            </Badge>
                          )}
                          {task.deadline && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              Due: {format(new Date(task.deadline), 'dd MMM')}
                            </span>
                          )}
                        </div>
                        {/* Second row: Description */}
                        {task.description && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                            {stripHtml(task.description)}
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
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Comments</h3>
            
            {/* Add Comment Form */}
            <div className="space-y-2 mb-3 sm:mb-4 relative">
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
                className="w-full bg-primary text-white hover:bg-primary/90 text-sm h-9 sm:h-10"
              >
                <Send className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              {sortedComments.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground">No comments yet</p>
              ) : (
                sortedComments.map((comment: ProjectComment, index: number) => {
                  const isOwnComment = profile?.id === comment.user_id;
                  const isEditing = editingCommentId === comment.id;
                  return (
                    <div key={comment.id || index} className="flex items-start gap-1.5 sm:gap-2">
                      <Checkbox
                        checked={comment.acknowledged || false}
                        onCheckedChange={(checked) =>
                          handleAcknowledgmentChange(comment.id, checked === true)
                        }
                        disabled={updateAcknowledgmentMutation.isPending}
                        className="mt-0.5 sm:mt-1 h-4 w-4"
                      />
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
                                className="rounded-[8px] text-xs sm:text-sm"
                                disabled={updateCommentMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveEditComment}
                                disabled={!editingCommentText.trim() || updateCommentMutation.isPending}
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
  );
};

