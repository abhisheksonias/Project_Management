import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Comment {
  id: string;
  user_name: string;
  created_at: string;
  message: string;
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
  const { profile } = useAuth();
  const { toast } = useToast();

  const loadComments = () => {
    // Load comments from task.comment JSONB field
    if (task.comment && Array.isArray(task.comment)) {
      setComments(task.comment);
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
      // Create new comment object
      const newCommentObj: Comment = {
        id: crypto.randomUUID(),
        user_name: profile.name,
        created_at: new Date().toISOString(),
        message: newComment.trim(),
      };

      // Get existing comments and add new one
      const existingComments = task.comment && Array.isArray(task.comment) ? task.comment : [];
      const updatedComments = [...existingComments, newCommentObj];

      // Update task with new comments array
      const { error } = await supabase
        .from('tasks')
        .update({
          comment: updatedComments as any,
          updated_at: new Date().toISOString(),
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddComment();
    }
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
              <DialogTitle>Task Comments</DialogTitle>
              <div className="mt-2">
                <h3 className="font-medium">{task.name}</h3>
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

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Comments List */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  No comments yet. Be the first to add one!
                </CardContent>
              </Card>
            ) : (
              comments
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">{comment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>

        {/* Add Comment Form */}
        <div className="border-t pt-4 space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your comment here... (Ctrl+Enter to send)"
            rows={3}
            className="min-h-[80px]"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Press Ctrl+Enter to send
            </span>
            <Button onClick={handleAddComment} disabled={loading || !newComment.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};