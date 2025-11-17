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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Task, TaskComment } from '../services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { useAddTaskComment, useUpdateTaskCommentAcknowledgment } from '../hooks/useTaskComments';
import { format } from 'date-fns';
import { Calendar, Clock, Folder, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionAutocomplete } from '@/features/projects/ui/MentionAutocomplete';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/features/users/services/userService';
import { parseMentions, extractMentionedUserIds } from '@/shared/utils/mentionParser';

interface TaskDetailsPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  task,
  open,
  onClose,
}) => {
  const { profile } = useAuth();
  const [commentText, setCommentText] = useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const addCommentMutation = useAddTaskComment();
  const updateAcknowledgmentMutation = useUpdateTaskCommentAcknowledgment();

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

  if (!task) return null;

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
    if (!commentText.trim() || !profile || !task) return;

    // Parse mentions from comment text
    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(commentText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    addCommentMutation.mutate(
      {
        taskId: task.id,
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

  const handleMentionSelect = (userId: string, userName: string) => {
    // Mention is already inserted by MentionAutocomplete
    // This is just for tracking if needed
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

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{task.name}</SheetTitle>
          <SheetDescription>
            {task.description || 'No description available'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Task Info - Compact */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={cn('text-xs', getStatusColor(task.status))}>
                {task.status || 'To Do'}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Priority:</span>
              {task.priority ? (
                <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
                  {task.priority}
                </Badge>
              ) : (
                <span className="font-medium">-</span>
              )}
            </div>
            {task.type && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{task.type}</span>
                </div>
              </>
            )}
            {task.category && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium capitalize">{task.category}</span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-4">
            {task.projects?.name && (
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <p className="text-sm font-medium">{task.projects.name}</p>
                </div>
              </div>
            )}

            {task.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="text-sm font-medium">
                    {format(new Date(task.deadline), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}

            {task.estimate_hours && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Estimate</p>
                  <p className="text-sm font-medium">{task.estimate_hours} hours</p>
                </div>
              </div>
            )}

            {task.created_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {format(new Date(task.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
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
                className="resize-none"
              />
              <MentionAutocomplete
                users={allUsers}
                text={commentText}
                onTextChange={setCommentText}
                onMentionSelect={handleMentionSelect}
                textareaRef={textareaRef}
              />
              <Button
                onClick={handleAddComment}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                className="w-full bg-primary text-white hover:bg-primary/90"
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
                sortedComments.map((comment: TaskComment, index: number) => (
                  <div key={comment.id || index} className="flex items-start gap-2">
                    <Checkbox
                      checked={comment.acknowledged || false}
                      onCheckedChange={(checked) =>
                        handleAcknowledgmentChange(comment.id, checked === true)
                      }
                      disabled={updateAcknowledgmentMutation.isPending}
                      className="mt-1"
                    />
                    <div className="flex-1 bg-secondary rounded-lg p-2.5 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="font-medium text-sm">{comment.user_name}</span>
                        <div className="flex items-center gap-2">
                          {comment.acknowledged && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{comment.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

