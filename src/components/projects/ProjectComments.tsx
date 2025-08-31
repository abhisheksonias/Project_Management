import React, { useState } from 'react';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  user_name: string;
  created_at: string;
  message: string;
}

interface Project {
  id: string;
  name: string;
  comments?: any;
}

interface ProjectCommentsProps {
  project: Project;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const ProjectComments: React.FC<ProjectCommentsProps> = ({ 
  project, 
  onClose, 
  onCommentAdded 
}) => {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const comments: Comment[] = Array.isArray(project.comments) ? project.comments : [];

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !profile) return;

    try {
      setSubmitting(true);

      // Create new comment object
      const comment = {
        id: crypto.randomUUID(),
        user_name: profile.name,
        created_at: new Date().toISOString(),
        message: newComment.trim(),
      };

      // Add to existing comments array
      const updatedComments = [...comments, comment];

      // Update project with new comments as JSON
      const { error } = await supabase
        .from('projects')
        .update({ 
          comments: JSON.parse(JSON.stringify(updatedComments))
        })
        .eq('id', project.id);

      if (error) throw error;

      setNewComment('');
      onCommentAdded();
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Comments - {project.name}</CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        
        <CardContent className="flex flex-col flex-1 space-y-4 min-h-0">
          {/* Comments List */}
          <ScrollArea className="flex-1 max-h-96">
            <div className="space-y-4 pr-4">
              {comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No comments yet.</p>
                  <p className="text-sm">Be the first to add a comment!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm">{comment.user_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Add Comment Form */}
          <div className="space-y-3 border-t pt-4">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};