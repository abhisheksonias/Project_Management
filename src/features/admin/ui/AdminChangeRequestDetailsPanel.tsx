import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { Editor } from '@tiptap/react';
import { CheckCircle2, Edit2, Send } from 'lucide-react';
import { useAddChangeRequestComment, useUpdateChangeRequestComment } from '@/features/changeRequests/hooks/useChangeRequestComments';
import { ChangeRequestRow } from '@/features/changeRequests/types';
import { parseMentions, extractMentionedUserIds } from '@/shared/utils/mentionParser';
import { stripHtml } from '@/shared/utils/htmlUtils';
import { HtmlContent } from '@/shared/ui/HtmlContent';
import { MentionAutocompleteForEditor } from '@/features/projects/ui/MentionAutocompleteForEditor';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AdminChangeRequestDetailsPanelProps {
  request: ChangeRequestRow | null;
  open: boolean;
  onClose: () => void;
  currentUser: { id: string; name?: string | null } | null;
  allUsers: Array<{ id: string; name: string }>;
  onStatusChange: (id: string, status: string) => Promise<void> | void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export const AdminChangeRequestDetailsPanel: React.FC<AdminChangeRequestDetailsPanelProps> = ({
  request,
  open,
  onClose,
  currentUser,
  allUsers,
  onStatusChange,
  onReject,
  onDelete,
  onRefresh,
}) => {
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const commentEditorRef = React.useRef<Editor | null>(null);
  const editCommentEditorRef = React.useRef<Editor | null>(null);
  const addCommentMutation = useAddChangeRequestComment();
  const updateCommentMutation = useUpdateChangeRequestComment();

  const comments = useMemo(() => {
    if (!request?.comments) return [];
    return Array.isArray(request.comments) ? request.comments : [];
  }, [request?.comments]);

  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [comments]
  );

  const hasCommentContent = (html: string) => {
    const trimmed = html.trim();
    if (!trimmed || trimmed === '<p></p>') return false;
    if (stripHtml(html).trim()) return true;
    return /<img[\s>]/i.test(trimmed);
  };

  if (!request) return null;

  const handleAddComment = () => {
    if (!currentUser || !hasCommentContent(commentText)) return;
    const plainText = stripHtml(commentText);
    const userMap = new Map(allUsers.map((u) => [u.id, { id: u.id, name: u.name }]));
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    addCommentMutation.mutate(
      {
        requestId: request.id,
        message: commentText.trim(),
        userId: currentUser.id,
        userName: currentUser.name || 'User',
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          setCommentText('');
          commentEditorRef.current?.commands.clearContent();
          onRefresh();
        },
      }
    );
  };

  const handleSaveEditComment = () => {
    if (!editingCommentId || !hasCommentContent(editingCommentText)) return;
    const plainText = stripHtml(editingCommentText);
    const userMap = new Map(allUsers.map((u) => [u.id, { id: u.id, name: u.name }]));
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    updateCommentMutation.mutate(
      {
        requestId: request.id,
        commentId: editingCommentId,
        message: editingCommentText.trim(),
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          setEditingCommentId(null);
          setEditingCommentText('');
          onRefresh();
        },
      }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="flex h-full w-full flex-col overflow-hidden p-3 sm:max-w-2xl sm:p-5">
          <SheetHeader className="space-y-1 pb-3 text-left">
            <SheetTitle className="pr-8 text-xl">{request.title}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{request.projects?.name || 'No project'}</span>
              <span>•</span>
              <span className="capitalize">{request.category}</span>
              {request.created_at && (
                <>
                  <span>•</span>
                  <span>{format(new Date(request.created_at), 'MMM dd, HH:mm')}</span>
                </>
              )}
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-8 pr-1">
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border bg-card p-3">
              <Select value={request.status} onValueChange={(v) => onStatusChange(request.id, v)}>
                <SelectTrigger className="h-9 w-40 rounded-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => onReject(request.id)} className="h-9 text-destructive">
                Reject
              </Button>
              <Button variant="outline" onClick={() => onDelete(request.id)} className="h-9 text-destructive">
                Delete
              </Button>
              <Badge variant="outline" className="h-9 rounded-[12px] px-3">
                {request.request_type === 'feedback' ? 'Feedback' : 'Change Request'}
              </Badge>
            </div>

            <div className="mb-4 rounded-[14px] border bg-card p-3">
              <h3 className="mb-2 text-sm font-semibold">Description</h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(request.description || '') }}
              />
            </div>

            {request.reference_links && request.reference_links.length > 0 && (
              <div className="mb-4 rounded-[14px] border bg-card p-3">
                <h3 className="mb-2 text-sm font-semibold">Reference Links</h3>
                <ul className="ml-5 list-disc">
                  {request.reference_links.map((lnk: string, idx: number) => (
                    <li key={idx}>
                      <a href={lnk} target="_blank" rel="noreferrer" className="break-words text-primary underline">
                        {lnk}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {request.attachment_urls && request.attachment_urls.length > 0 && (
              <div className="mb-4 rounded-[14px] border bg-card p-3">
                <h3 className="mb-2 text-sm font-semibold">Attachments</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {request.attachment_urls.map((u: string, i: number) => {
                    const lower = u.split('?')[0].toLowerCase();
                    const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower);
                    const isPdf = /\.pdf$/.test(lower);
                    if (isImage) {
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setImageUrl(u);
                            setImageOpen(true);
                          }}
                          className="block"
                        >
                          <img src={u} alt={`att-${i}`} className="h-24 w-full rounded object-cover" />
                        </button>
                      );
                    }
                    if (isPdf) {
                      return (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="rounded bg-muted p-2 text-primary underline">
                          Open PDF
                        </a>
                      );
                    }
                    return (
                      <a key={i} href={u} target="_blank" rel="noreferrer" className="rounded bg-muted p-2 break-all text-primary underline">
                        {u}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold">Comments</h3>
              <div className="relative mb-3 space-y-2">
                <RichTextEditor
                  value={commentText}
                  onChange={setCommentText}
                  placeholder="Type a comment... Use @ to mention"
                  showToolbar={false}
                  className="text-sm"
                  onEditorReady={(editor) => {
                    commentEditorRef.current = editor;
                  }}
                />
                <MentionAutocompleteForEditor users={allUsers} editor={commentEditorRef.current} />
                <Button
                  onClick={handleAddComment}
                  disabled={!hasCommentContent(commentText) || addCommentMutation.isPending}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>

              <div className="space-y-2">
                {sortedComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                ) : (
                  sortedComments.map((comment: any) => {
                    const isOwn = currentUser?.id === comment.user_id;
                    const isEditing = editingCommentId === comment.id;
                    return (
                      <div key={comment.id} className="rounded-[12px] bg-secondary p-2.5">
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{comment.user_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {comment.acknowledged && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            {isOwn && !isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.message);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <RichTextEditor
                              value={editingCommentText}
                              onChange={setEditingCommentText}
                              showToolbar={false}
                              className="text-xs"
                              onEditorReady={(editor) => {
                                editCommentEditorRef.current = editor;
                              }}
                            />
                            <MentionAutocompleteForEditor users={allUsers} editor={editCommentEditorRef.current} />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSaveEditComment} disabled={!hasCommentContent(editingCommentText)}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <HtmlContent content={comment.message} className="text-xs" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attachment preview</DialogTitle>
          </DialogHeader>
          {imageUrl && <img src={imageUrl} alt="preview" className="max-h-[70vh] w-full object-contain" />}
          <DialogFooter>
            <Button onClick={() => setImageOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
