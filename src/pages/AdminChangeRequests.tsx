import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import DOMPurify from 'dompurify';
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
import { cn } from '@/lib/utils';

interface ChangeRequestRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: string;
  attachment_urls?: string[] | null;
  reference_links?: string[] | null;
  status: string;
  request_type?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  projects?: { name: string } | null;
  comments?: any[] | null;
}

const AdminChangeRequests: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [pageSize] = useState(12);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [displayItems, setDisplayItems] = useState<ChangeRequestRow[]>([]);

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
  });

  // Image lightbox
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = async (opts?: { append?: boolean; resetOffset?: boolean }, term?: string) => {
    try {
      setLoading(true);
      const q = (supabase as any)
        .from('change_requests')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (statusFilter !== 'All') {
        q.eq('status', statusFilter);
      }
      if (typeFilter !== 'All') {
        q.eq('request_type', typeFilter === 'Feedback' ? 'feedback' : 'change_request');
      }

      // Server-side search on title/description. We'll also do a client-side project name match below.
      if (term && term.trim() !== '') {
        const t = term.trim();
        // Run two queries in parallel:
        // 1) search title/description
        // 2) search by project name (joined table)
        const q1 = (supabase as any)
          .from('change_requests')
          .select('*, projects(name)')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        const q2 = (supabase as any)
          .from('change_requests')
          .select('*, projects(name)')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (statusFilter !== 'All') {
          q1.eq('status', statusFilter);
          q2.eq('status', statusFilter);
        }
        if (typeFilter !== 'All') {
          q1.eq('request_type', typeFilter === 'Feedback' ? 'feedback' : 'change_request');
          q2.eq('request_type', typeFilter === 'Feedback' ? 'feedback' : 'change_request');
        }

        q1.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
        // filter by related project's name
        q2.ilike('projects.name', `%${t}%`);

        const [res1, res2] = await Promise.all([q1, q2]);
        if (res1.error) {
          console.error('Supabase query error', res1.error);
          throw res1.error;
        }
        if (res2.error) {
          console.error('Supabase query error', res2.error);
          throw res2.error;
        }

        const rows1 = (res1.data || []) as ChangeRequestRow[];
        const rows2 = (res2.data || []) as ChangeRequestRow[];

        // Merge unique by id
        const map = new Map<string, ChangeRequestRow>();
        [...rows1, ...rows2].forEach((r) => {
          if (r && r.id) map.set(r.id, r);
        });
        const rows = Array.from(map.values());
        const tLow = t.toLowerCase();
        const finalRows = rows.filter((r) => {
          const projectName = r.projects?.name || '';
          return (
            r.title.toLowerCase().includes(tLow) ||
            (r.description || '').toLowerCase().includes(tLow) ||
            projectName.toLowerCase().includes(tLow)
          );
        });

        // By default hide Completed and Rejected unless user explicitly filters by status
        const visibleRows = finalRows.filter((r) =>
          statusFilter === 'All' ? !['Completed', 'Rejected'].includes(r.status) : true,
        );

        if (opts?.append) {
          setItems((prev) => {
            const combined = [...prev, ...visibleRows];
            const m = new Map<string, ChangeRequestRow>();
            combined.forEach((it) => m.set(it.id, it));
            return Array.from(m.values());
          });
        } else {
          setItems(visibleRows);
        }
        setHasMore(rows.length === pageSize);
        return;
      }

      const { data, error } = await q;
      if (error) {
        console.error('Supabase query error', error);
        throw error;
      }

      const rows = (data || []) as ChangeRequestRow[];
      const visibleRows = rows.filter((r) =>
        statusFilter === 'All' ? !['Completed', 'Rejected'].includes(r.status) : true,
      );

      if (opts?.append) {
        setItems((prev) => {
          const combined = [...prev, ...visibleRows];
          const m = new Map<string, ChangeRequestRow>();
          combined.forEach((it) => m.set(it.id, it));
          return Array.from(m.values());
        });
      } else {
        setItems(visibleRows);
      }

      setHasMore(rows.length === pageSize);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initialize offset to 0; actual loading happens in the filter effect below
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Immediate client-side filtering for instant UX while we debounce server queries
  useEffect(() => {
    if (!searchTerm) {
      setDisplayItems(items);
    } else {
      const t = searchTerm.trim().toLowerCase();
      setDisplayItems(
        items.filter((r) => {
          const projectName = r.projects?.name || '';
          return (
            r.title.toLowerCase().includes(t) ||
            (r.description || '').toLowerCase().includes(t) ||
            projectName.toLowerCase().includes(t)
          );
        }),
      );
    }
  }, [items, searchTerm]);

  // Debounce the search term for server-side queries (keeps UX instant but avoids spamming Supabase)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Load when filters, pagination offset, or debounced search change.
  useEffect(() => {
    // If offset > 0 we are loading more (append), otherwise full reload
    load({ append: offset > 0 }, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, offset, debouncedSearch]);

  const handleReject = async (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTargetId) return;
    try {
      const { error } = await (supabase as any)
        .from('change_requests')
        .update({ status: 'Rejected', updated_at: new Date().toISOString() })
        .eq('id', rejectTargetId);
      if (error) throw error;
      setRejectDialogOpen(false);
      toast.success('Request rejected');
      // TODO: optionally log rejectReason somewhere
      load({ append: false }, debouncedSearch);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await (supabase as any)
        .from('change_requests')
        .delete()
        .eq('id', deleteTargetId);
      if (error) throw error;
      setDeleteDialogOpen(false);
      toast.success('Request deleted');
      load({ append: false }, debouncedSearch);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  // Conversion to tasks removed — change requests are managed independently.

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!profile) {
      toast.error('Not authenticated');
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('change_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      toast.success('Status updated');
      load({ append: false }, debouncedSearch);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleAddComment = (requestId: string) => {
    const text = commentText[requestId];
    if (!text?.trim() || !profile) return;

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
        userId: profile.id,
        userName: profile.name || 'Admin',
        mentions: mentionedUserIds,
      },
      {
        onSuccess: () => {
          setCommentText((prev) => ({ ...prev, [requestId]: '' }));
          commentEditorRefs.current[requestId]?.commands.clearContent();
        },
      }
    );
  };

  const handleSaveEditComment = (requestId: string) => {
    if (!profile || !editingCommentId) return;
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
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen mt-16 sm:mt-0" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Admin — Change Requests</h1>
            <p className="text-sm text-muted-foreground mb-4">Review incoming client change requests. Review and reject or update status.</p>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Input
                placeholder="Search change requests..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setOffset(0);
                }}
                className="h-8 w-full sm:w-72"
              />
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Change Request">Change Request</SelectItem>
                  <SelectItem value="Feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
              
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : displayItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No change requests</div>
            ) : (
              <div className="space-y-4">
                {displayItems.map((r) => (
                  <div key={r.id} className="border rounded p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{r.title}</div>
                          {r.request_type ? (
                            r.request_type === 'feedback' ? (
                              <Badge>Feedback</Badge>
                            ) : (
                              <Badge>Change Request</Badge>
                            )
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <div className="truncate">{r.projects?.name || 'No project'}</div>
                          <div>•</div>
                          <div>{r.category}</div>
                          <div>•</div>
                          <div>{r.created_at ? format(new Date(r.created_at), 'Pp') : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* <div>
                          <Badge className="mr-2">{r.status}</Badge>
                        </div> */}
                        <Select onValueChange={(v) => handleStatusChange(r.id, v)} value={r.status}>
                          <SelectTrigger className="h-8 w-40">
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
                        <button onClick={() => handleReject(r.id)} className="px-3 py-1 border rounded text-sm text-destructive hover:bg-destructive/10">Reject</button>
                        <button onClick={() => handleDelete(r.id)} className="px-3 py-1 border rounded text-sm text-destructive hover:bg-destructive/10">Delete</button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <Accordion type="multiple" className="w-full">
                        <AccordionItem value="description">
                          <AccordionTrigger className="py-2">
                            <div className="text-sm text-muted-foreground">Description</div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.description || '') }}
                            />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="comments">
                          <AccordionTrigger className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Comments</span>
                              <Badge variant="outline" className="h-5 px-1.5 min-w-[1.25rem] justify-center">
                                {r.comments ? (Array.isArray(r.comments) ? r.comments.length : 0) : 0}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-2">
                              <div className="flex items-center justify-end mb-3">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCommentBox(activeCommentBox === r.id ? null : r.id);
                                  }}
                                >
                                  {activeCommentBox === r.id ? 'Cancel' : 'Add Comment'}
                                </Button>
                              </div>

                              {activeCommentBox === r.id && (
                                <div className="mb-4 space-y-2 relative">
                                  <RichTextEditor
                                    value={commentText[r.id] || ''}
                                    onChange={(val) => setCommentText(prev => ({ ...prev, [r.id]: val }))}
                                    placeholder="Type a comment... Use @ to mention"
                                    showToolbar={false}
                                    className="text-xs"
                                    onEditorReady={(editor) => {
                                      commentEditorRefs.current[r.id] = editor;
                                    }}
                                  />
                                  <MentionAutocompleteForEditor
                                    users={allUsers}
                                    editor={commentEditorRefs.current[r.id]}
                                  />
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      className="h-8 text-xs"
                                      disabled={!commentText[r.id]?.trim() || addCommentMutation.isPending}
                                      onClick={() => handleAddComment(r.id)}
                                    >
                                      <Send className="mr-2 h-3.5 w-3.5" />
                                      Post
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {(!r.comments || (Array.isArray(r.comments) && r.comments.length === 0)) ? (
                                  <p className="text-xs text-muted-foreground italic">No comments yet</p>
                                ) : (
                                  [...(Array.isArray(r.comments) ? r.comments : [])]
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map((comment: any) => {
                                      const isOwn = profile?.id === comment.user_id;
                                      const isEditing = editingCommentId === comment.id;
                                      return (
                                        <div key={comment.id} className="flex flex-col bg-slate-50/50 rounded-lg p-2.5">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-semibold text-slate-900">{comment.user_name}</span>
                                              <span className="text-[10px] text-slate-500">
                                                {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              {comment.acknowledged && (
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                              )}
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
                                            <div className="space-y-2 mt-1 relative">
                                              <RichTextEditor
                                                value={editingCommentText}
                                                onChange={setEditingCommentText}
                                                showToolbar={false}
                                                className="text-xs"
                                                onEditorReady={(editor) => {
                                                  editCommentEditorRef.current = editor;
                                                }}
                                              />
                                              <MentionAutocompleteForEditor
                                                users={allUsers}
                                                editor={editCommentEditorRef.current}
                                              />
                                              <div className="flex justify-end gap-2 mt-1">
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="h-7 text-[10px]"
                                                  onClick={() => setEditingCommentId(null)}
                                                >
                                                  Cancel
                                                </Button>
                                                <Button 
                                                  size="sm" 
                                                  className="h-7 text-[10px]"
                                                  onClick={() => handleSaveEditComment(r.id)}
                                                >
                                                  Save
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-xs text-slate-700 leading-relaxed">
                                              <HtmlContent content={comment.message} className="text-xs" />
                                              {comment.is_edited && (
                                                <span className="text-[10px] text-slate-400 italic ml-1">(edited)</span>
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

                    {r.reference_links && Array.isArray(r.reference_links) && r.reference_links.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium mb-1">Reference links</div>
                        <ul className="list-disc ml-5">
                          {r.reference_links.map((lnk: any, idx: number) => (
                            <li key={idx}>
                              <a href={lnk} target="_blank" rel="noreferrer" className="text-primary underline break-words">{lnk}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {r.attachment_urls && r.attachment_urls.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium mb-2">Attachments</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {r.attachment_urls.map((u: string, i: number) => {
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
                                  <img src={u} alt={`att-${i}`} className="h-24 w-full object-cover rounded" />
                                </button>
                              );
                            }
                            if (isPdf) {
                              return (
                                <div key={i} className="p-2 bg-gray-50 rounded">
                                  <a href={u} target="_blank" rel="noreferrer" className="text-primary underline">Open PDF</a>
                                </div>
                              );
                            }
                            return (
                              <div key={i} className="p-2 bg-gray-50 rounded break-all">
                                <a href={u} target="_blank" rel="noreferrer" className="text-primary underline">{u}</a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {hasMore && !loading && (
              <div className="flex justify-center mt-4">
                <Button
                    onClick={() => {
                    const newOffset = offset + pageSize;
                    setOffset(newOffset);
                    load({ append: true }, debouncedSearch);
                  }}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Image lightbox */}
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

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">Optional reason for rejection (not stored):</p>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </AdminLayout>
  );
};

export default AdminChangeRequests;

