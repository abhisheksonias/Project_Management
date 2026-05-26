import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { AdminChangeRequestDetailsPanel } from '@/features/admin/ui/AdminChangeRequestDetailsPanel';
import { useAdminProjectsForFilter } from '@/features/admin/hooks/useAdminProjects';
import { ChangeRequestRow } from '@/features/changeRequests/types';
import { userService } from '@/features/users/services/userService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const AdminChangeRequests: React.FC = () => {
  const { profile } = useAuth();
  const { data: projects = [] } = useAdminProjectsForFilter();
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
  });

  const [items, setItems] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [pageSize] = useState(12);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestRow | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = async (opts?: { append?: boolean }) => {
    try {
      setLoading(true);
      const q = (supabase as any)
        .from('change_requests')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (statusFilter !== 'All') q.eq('status', statusFilter);
      if (typeFilter !== 'All') q.eq('request_type', typeFilter === 'Feedback' ? 'feedback' : 'change_request');
      if (projectFilter !== 'all') q.eq('project_id', projectFilter);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as ChangeRequestRow[];
      if (opts?.append) {
        setItems((prev) => {
          const merged = [...prev, ...rows];
          const uniq = new Map<string, ChangeRequestRow>();
          merged.forEach((item) => uniq.set(item.id, item));
          return Array.from(uniq.values());
        });
      } else {
        setItems(rows);
      }
      setHasMore(rows.length === pageSize);

      if (selectedRequest) {
        const fresh = rows.find((r) => r.id === selectedRequest.id);
        if (fresh) setSelectedRequest(fresh);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setOffset(0), []);
  useEffect(() => {
    load({ append: offset > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, projectFilter, offset]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!profile) return;
    const { error } = await (supabase as any)
      .from('change_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success('Status updated');
    await load({ append: false });
  };

  const confirmReject = async () => {
    if (!rejectTargetId) return;
    const { error } = await (supabase as any)
      .from('change_requests')
      .update({ status: 'Rejected', updated_at: new Date().toISOString() })
      .eq('id', rejectTargetId);
    if (error) {
      toast.error('Failed to reject');
      return;
    }
    setRejectDialogOpen(false);
    toast.success('Request rejected');
    await load({ append: false });
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await (supabase as any).from('change_requests').delete().eq('id', deleteTargetId);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    setDeleteDialogOpen(false);
    toast.success('Request deleted');
    setIsPanelOpen(false);
    setSelectedRequest(null);
    await load({ append: false });
  };

  return (
    <AdminLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 pb-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Change Requests</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Manage and track all change requests across the organization.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3">
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setOffset(0); }}>
            <SelectTrigger className="h-9 w-full sm:w-52"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); }}>
            <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Change Request">Change Request</SelectItem>
              <SelectItem value="Feedback">Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No change requests</div>
          ) : (
            items.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRequest(r);
                  setIsPanelOpen(true);
                }}
                className="w-full rounded-[14px] border bg-white p-3 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm sm:text-base font-semibold">{r.title}</h3>
                  <Badge variant="outline">{r.request_type === 'feedback' ? 'Feedback' : 'Change Request'}</Badge>
                  <Badge>{r.status || 'Open'}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.projects?.name || 'No project'}</span>
                  <span>•</span>
                  <span className="capitalize">{r.category}</span>
                  {r.created_at && (
                    <>
                      <span>•</span>
                      <span>{format(new Date(r.created_at), 'MMM dd, HH:mm')}</span>
                    </>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {hasMore && !loading && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setOffset((prev) => prev + pageSize)}>Load more</Button>
          </div>
        )}
      </div>

      <AdminChangeRequestDetailsPanel
        request={selectedRequest}
        open={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedRequest(null);
        }}
        currentUser={profile ? { id: profile.id, name: profile.name } : null}
        allUsers={allUsers.map((u) => ({ id: u.id, name: u.name }))}
        onStatusChange={handleStatusChange}
        onReject={(id) => {
          setRejectTargetId(id);
          setRejectDialogOpen(true);
        }}
        onDelete={(id) => {
          setDeleteTargetId(id);
          setDeleteDialogOpen(true);
        }}
        onRefresh={() => load({ append: false })}
      />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Change Request</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Change Request</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to delete this change request? This action cannot be undone.
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

