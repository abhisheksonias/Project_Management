import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mention } from '../services/mentionService';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { useUpdateCommentAcknowledgment } from '@/features/dashboard/hooks/useProjectMutations';
import { useUpdateTaskCommentAcknowledgment } from '@/features/tasks/hooks/useTaskComments';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface MentionsCardProps {
  mentions: Mention[];
}

export const ProjectMentionsCard: React.FC<MentionsCardProps> = ({ mentions }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const updateProjectAcknowledgmentMutation = useUpdateCommentAcknowledgment();
  const updateTaskAcknowledgmentMutation = useUpdateTaskCommentAcknowledgment();

  const handleAcknowledge = (mention: Mention, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;

    if (mention.type === 'project') {
      updateProjectAcknowledgmentMutation.mutate({
        projectId: mention.projectId,
        commentId: mention.commentId,
        acknowledged: true,
        acknowledgedBy: profile.id,
      });
    } else if (mention.type === 'task') {
      updateTaskAcknowledgmentMutation.mutate({
        taskId: mention.taskId,
        commentId: mention.commentId,
        acknowledged: true,
        acknowledgedBy: profile.id,
      });
    }
  };

  const handleView = (mention: Mention) => {
    if (mention.type === 'project') {
      navigate('/user/projects');
    } else if (mention.type === 'task') {
      navigate('/user/tasks');
    }
  };

  if (mentions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base font-semibold">Mentions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        {mentions.map((mention) => (
          <div
            key={mention.id}
            className="border rounded-lg p-2 sm:p-3 space-y-2 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                  {mention.type === 'project' ? (
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      Project: {mention.projectName}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        Task: {mention.taskName}
                      </Badge>
                      {mention.projectName && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {mention.projectName}
                        </Badge>
                      )}
                    </>
                  )}
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {format(new Date(mention.created_at), 'MMM dd, HH:mm')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium mb-1">{mention.user_name}</p>
                <p className="text-xs sm:text-sm text-gray-700">{mention.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleAcknowledge(mention, e)}
                disabled={
                  (mention.type === 'project' && updateProjectAcknowledgmentMutation.isPending) ||
                  (mention.type === 'task' && updateTaskAcknowledgmentMutation.isPending)
                }
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0"
                title="Acknowledge"
              >
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
              </Button>
            </div>
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(mention)}
              className="w-full text-xs"
            >
              {mention.type === 'project' ? 'View Project' : 'View Task'}
            </Button> */}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

