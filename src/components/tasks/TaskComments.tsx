import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X, Send, MessageCircle, Edit2, Trash2, Check, XIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  created_at: string;
  updated_at?: string;
  message: string;
  is_edited?: boolean;
}

interface Task {
  id: string;
  name: string;
  type: string;
  status: string;
  comment: any;
}

interface TaskCommentsProps {
  task: Task;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({
  task,
  onClose,
  onCommentAdded,
}) => {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const { profile } = useAuth();
  const { toast } = useToast();

  const loadComments = () => {
    // Load comments from task.comment JSONB field
    if (task.comment && Array.isArray(task.comment)) {
      // Ensure backward compatibility with old comments that might not have updated_at
      const processedComments = task.comment.map((comment: any) => ({
        ...comment,
        updated_at: comment.updated_at || comment.created_at,
        is_edited: comment.is_edited || false,
        user_id: comment.user_id || '',
      }));
      setComments(processedComments);
    } else {
      setComments([]);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: 'Error',
        description: 'Comment message is required',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.name) {
      toast({
        title: 'Error',
        description: 'User profile not found',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      
      // Create new comment object with enhanced fields
      const newCommentObj: Comment = {
        id: crypto.randomUUID(),
        user_id: profile.id || '',
        user_name: profile.name,
        created_at: now,
        updated_at: now,
        message: newComment.trim(),
        is_edited: false,
      };

      // Get existing comments and add new one
      const existingComments = task.comment && Array.isArray(task.comment) ? task.comment : [];
      const updatedComments = [...existingComments, newCommentObj];

      // Update task with new comments array
      const { error } = await supabase
        .from('tasks')
        .update({
          comment: updatedComments as any,
          updated_at: now,
        })
        .eq('id', task.id);

      if (error) {
        console.error('Error adding comment:', error);
        toast({
          title: 'Error',
          description: 'Failed to add comment',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });

      setNewComment('');
      setComments(updatedComments);
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingText.trim()) {
      toast({
        title: 'Error',
        description: 'Comment message cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      
      // Update the comment in the array
      const updatedComments = comments.map(comment => 
        comment.id === commentId
          ? {
              ...comment,
              message: editingText.trim(),
              updated_at: now,
              is_edited: true,
            }
          : comment
      );

      // Update task with modified comments array
      const { error } = await supabase
        .from('tasks')
        .update({
          comment: updatedComments as any,
          updated_at: now,
        })
        .eq('id', task.id);

      if (error) {
        console.error('Error updating comment:', error);
        toast({
          title: 'Error',
          description: 'Failed to update comment',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Comment updated successfully',
      });

      setComments(updatedComments);
      setEditingCommentId(null);
      setEditingText('');
      onCommentAdded();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setLoading(true);

    try {
      // Remove the comment from the array
      const updatedComments = comments.filter(comment => comment.id !== commentId);

      // Update task with modified comments array
      const { error } = await supabase
        .from('tasks')
        .update({
          comment: updatedComments as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) {
        console.error('Error deleting comment:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete comment',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });

      setComments(updatedComments);
      onCommentAdded();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.message);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddComment();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleEditComment(editingCommentId!);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canEditComment = (comment: Comment) => {
    return profile?.id === comment.user_id;
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  useEffect(() => {
    loadComments();
  }, [task]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Task Comments
                <Badge variant="outline" className="ml-2">
                  {comments.length}
                </Badge>
              </DialogTitle>
              <div className="mt-2">
                <h3 className="font-medium text-base">{task.name}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{task.type}</Badge>
                  <Badge variant="secondary">{task.status}</Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Comments List */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to add one!</p>
                </CardContent>
              </Card>
            ) : (
              comments
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((comment) => (
                  <Card key={comment.id} className="relative group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* User Avatar */}

                        {/* Comment Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.user_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCommentDate(comment.created_at)}
                            </span>
                            {comment.is_edited && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                edited
                              </Badge>
                            )}
                            {comment.updated_at && comment.updated_at !== comment.created_at && (
                              <span className="text-xs text-muted-foreground">
                                • updated {formatCommentDate(comment.updated_at)}
                              </span>
                            )}
                          </div>

                          {/* Comment Message */}
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={handleEditKeyPress}
                                placeholder="Edit your comment..."
                                rows={3}
                                className="min-h-[80px]"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={loading || !editingText.trim()}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={cancelEditing}
                                  disabled={loading}
                                >
                                  <XIcon className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {comment.message}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {canEditComment(comment) && editingCommentId !== comment.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingComment(comment)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>

        {/* Add Comment Form */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-start gap-3">
           
            
            {/* Comment Input */}
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your comment here... (Ctrl+Enter to send)"
                rows={3}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center pl-11">
            <span className="text-xs text-muted-foreground">
              Press Ctrl+Enter to send • Escape to cancel editing
            </span>
            <Button 
              onClick={handleAddComment} 
              disabled={loading || !newComment.trim()}
              className="min-w-[100px]"
            >
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};