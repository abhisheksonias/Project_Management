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

  // Image lightbox
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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
                        <button onClick={() => handleReject(r.id)} className="px-3 py-1 border rounded text-sm text-destructive">Reject</button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <Accordion type="single" collapsible>
                        <AccordionItem value={r.id}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full">
                              <div className="text-sm text-muted-foreground">Description</div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.description || '') }}
                            />
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
    </AdminLayout>
  );
};

export default AdminChangeRequests;

