import React, { useEffect, useState } from 'react';
import { changeRequestService, ChangeRequest } from '@/features/changeRequests/services/changeRequestService';
import { sanitizeChangeRequestHtml } from '@/features/changeRequests/utils/sanitizeChangeRequestHtml';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAddChangeRequestComment, useUpdateChangeRequestComment } from '@/features/changeRequests/hooks/useChangeRequestComments';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { HtmlContent } from '@/shared/ui/HtmlContent';
import { MentionAutocompleteForEditor } from '@/features/projects/ui/MentionAutocompleteForEditor';
import { userService } from '@/features/users/services/userService';
import { useQuery } from '@tanstack/react-query';
import { Send, Edit2, CheckCircle2 } from 'lucide-react';
import { stripHtml } from '@/shared/utils/htmlUtils';
import { parseMentions, extractMentionedUserIds } from '@/shared/utils/mentionParser';
import { Editor } from '@tiptap/react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface Props {
  projectId: string;
  refreshKey?: any;
  readOnly?: boolean;
}

export const ChangeRequestsList: React.FC<Props> = ({ projectId, refreshKey, readOnly }) => {
  const { profile } = useAuth();
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Comments state
  const [activeCommentBox, setActiveCommentBox] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const commentEditorRefs = React.useRef<{ [key: string]: Editor | null }>({});
  const editCommentEditorRef = React.useRef<Editor | null>(null);

  const addCommentMutation = useAddChangeRequestComment();
  const updateCommentMutation = useUpdateChangeRequestComment();

  // Fetch all users for mention autocomplete
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
    enabled: !!profile, // Mentions only for logged in users
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await changeRequestService.listByProject(projectId);
      setItems(data);
    } catch (err: any) {
      toast.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // support external refresh by reloading when refreshKey changes (optional)
  useEffect(() => {
    if (refreshKey) {
      load();
    }
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await changeRequestService.delete(deleteTargetId);
      setDeleteDialogOpen(false);
      toast.success('Request deleted');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const handleAddComment = (requestId: string) => {
    const text = commentText[requestId];
    if (!text?.trim()) return;

    // Use current profile if exists, otherwise "Guest"
    const userId = profile?.id || 'guest';
    const userName = profile?.name || 'Guest / Client';

    const plainText = stripHtml(text);
    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    addCommentMutation.mutate(
      {
        requestId,
        message: text.trim(),
        userId,
        userName,
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          setCommentText((prev) => ({ ...prev, [requestId]: '' }));
          commentEditorRefs.current[requestId]?.commands.clearContent();
          load(); // Manual reload for list
        },
      }
    );
  };

  const handleSaveEditComment = (requestId: string) => {
    if (!editingCommentId) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed) return;

    const plainText = stripHtml(trimmed);
    const userMap = new Map(
      allUsers.map((user) => [user.id, { id: user.id, name: user.name }])
    );
    const mentions = parseMentions(plainText, userMap);
    const mentionedUserIds = extractMentionedUserIds(mentions);

    updateCommentMutation.mutate(
      {
        requestId,
        commentId: editingCommentId,
        message: trimmed,
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          setEditingCommentId(null);
          setEditingCommentText('');
          load();
        },
      }
    );
  };

  if (loading) return <div>Loading...</div>;
  if (items.length === 0) return <div className="text-sm text-muted-foreground">No change requests yet.</div>;

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="border rounded p-3 bg-white shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.category} • {new Date(r.created_at || '').toLocaleString()}</div>
            </div>
            <div>
              <span className="text-sm font-semibold mr-3">{r.status}</span>
              {!readOnly && (
                <button onClick={() => handleDelete(r.id)} className="px-2 py-1 border rounded text-xs text-destructive hover:bg-destructive/10">Delete</button>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm">
            <Accordion type="single" collapsible>
              <AccordionItem value={r.id}>
                <AccordionTrigger>
                  <div className="text-sm text-muted-foreground">Description</div>
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeChangeRequestHtml(r.description || ''),
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Reference links */}
          {r.reference_links && (
            (() => {
              // Normalize reference links (handle string or array)
              const raw = Array.isArray(r.reference_links)
                ? r.reference_links
                : typeof r.reference_links === 'string'
                  ? (() => {
                    try { return JSON.parse(r.reference_links as string); } catch { return (r.reference_links as string).split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean); }
                  })()
                  : [];

              const links: string[] = Array.isArray(raw) ? raw.map((s: any) => String(s).trim()).filter(Boolean) : [];
              if (links.length === 0) return null;

              return (
                <div className="mt-3">
                  <div className="text-xs font-medium mb-1">Reference links</div>
                  <ul className="list-disc ml-5">
                    {links.map((lnk, idx) => {
                      let label = lnk;
                      try {
                        const url = new URL(lnk);
                        label = `${url.hostname}${url.pathname.length > 1 ? url.pathname : ''}`;
                        if (label.length > 60) label = label.slice(0, 57) + '...';
                      } catch {
                        if (label.length > 60) label = label.slice(0, 57) + '...';
                      }

                      return (
                        <li key={idx}>
                          <a
                            href={lnk}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline break-words"
                            title={lnk}
                          >
                            {label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()
          )}

          {/* Attachments: show previews for images, open pdfs in new tab, otherwise show link */}
          {r.attachment_urls && r.attachment_urls.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium mb-2">Attachments</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {r.attachment_urls.map((u: string, i: number) => {
                  const lower = u.split('?')[0].toLowerCase();
                  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower);
                  const isPdf = /\.pdf$/.test(lower);
                  if (isImage) {
                    return (
                      <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                        <img src={u} alt={`attachment-${i}`} className="max-h-40 w-full object-contain rounded" />
                      </a>
                    );
                  }

                  if (isPdf) {
                    return (
                      <div key={i}>
                        <a href={u} target="_blank" rel="noreferrer" className="text-primary underline">
                          Open PDF
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div key={i}>
                      <a href={u} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                        {u}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-3">
            <Accordion type="multiple" className="w-full">
              {/* <AccordionItem value="description">
                <AccordionTrigger className="py-2">
                  <div className="text-xs text-muted-foreground">Description</div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {r.description}
                  </div>
                </AccordionContent>
              </AccordionItem> */}

              <AccordionItem value="comments">
                <AccordionTrigger className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Comments</span>
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {r.comments ? (Array.isArray(r.comments) ? r.comments.length : 0) : 0}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <div className="flex items-center justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCommentBox(activeCommentBox === r.id ? null : r.id);
                        }}
                      >
                        {activeCommentBox === r.id ? 'Cancel' : 'Add Comment'}
                      </Button>
                    </div>

                    {activeCommentBox === r.id && (
                      <div className="mb-3 space-y-2 relative">
                        <RichTextEditor
                          value={commentText[r.id] || ''}
                          onChange={(val) => setCommentText(prev => ({ ...prev, [r.id]: val }))}
                          placeholder="Type a comment..."
                          showToolbar={false}
                          className="text-[11px]"
                          onEditorReady={(editor) => {
                            commentEditorRefs.current[r.id] = editor;
                          }}
                        />
                        {profile && (
                          <MentionAutocompleteForEditor
                            users={allUsers}
                            editor={commentEditorRefs.current[r.id]}
                          />
                        )}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            className="h-7 text-[10px]"
                            disabled={!commentText[r.id]?.trim() || addCommentMutation.isPending}
                            onClick={() => handleAddComment(r.id)}
                          >
                            <Send className="mr-1.5 h-3 w-3" />
                            Post
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {(!r.comments || (Array.isArray(r.comments) && r.comments.length === 0)) ? (
                        <p className="text-[10px] text-muted-foreground italic">No comments</p>
                      ) : (
                        [...(Array.isArray(r.comments) ? r.comments : [])]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((comment: any) => {
                            const isOwn = (profile?.id && profile.id === comment.user_id) || (comment.user_id === 'guest');
                            const isEditing = editingCommentId === comment.id;
                            return (
                              <div key={comment.id} className="flex flex-col bg-slate-50/50 rounded p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-900">{comment.user_name}</span>
                                    <span className="text-[9px] text-slate-500">
                                      {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {comment.acknowledged && (
                                      <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
                                    )}
                                    {isOwn && !isEditing && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4"
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditingCommentText(comment.message);
                                        }}
                                      >
                                        <Edit2 className="h-2.5 w-2.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {isEditing ? (
                                  <div className="space-y-1.5 mt-1 relative">
                                    <RichTextEditor
                                      value={editingCommentText}
                                      onChange={setEditingCommentText}
                                      showToolbar={false}
                                      className="text-[11px]"
                                      onEditorReady={(editor) => {
                                        editCommentEditorRef.current = editor;
                                      }}
                                    />
                                    {profile && (
                                      <MentionAutocompleteForEditor
                                        users={allUsers}
                                        editor={editCommentEditorRef.current}
                                      />
                                    )}
                                    <div className="flex justify-end gap-1.5 mt-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[9px]"
                                        onClick={() => setEditingCommentId(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-6 text-[9px]"
                                        onClick={() => handleSaveEditComment(r.id)}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-700 leading-normal">
                                    <HtmlContent content={comment.message} className="text-[11px]" />
                                    {comment.is_edited && (
                                      <span className="text-[9px] text-slate-400 italic ml-1">(edited)</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      ))}

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Change Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">Are you sure you want to delete this change request? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

