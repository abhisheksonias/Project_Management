import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { AdminChangeRequestDetailsPanel } from '@/features/admin/ui/AdminChangeRequestDetailsPanel';
import { ChangeRequestsKanbanView } from '@/features/changeRequests/ui/ChangeRequestsKanbanView';
import { useChangeRequestProjects } from '@/features/changeRequests/hooks/useChangeRequestProjects';
import { ChangeRequestRow } from '@/features/changeRequests/types';
import { userService } from '@/features/users/services/userService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminChangeRequests: React.FC = () => {
  const { profile } = useAuth();
  const { data: projects = [] } = useChangeRequestProjects();
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
  });

  const [items, setItems] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestRow | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const q = (supabase as any)
        .from('change_requests')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (typeFilter !== 'All') q.eq('request_type', typeFilter === 'Feedback' ? 'feedback' : 'change_request');
      if (projectFilter !== 'all') q.eq('project_id', projectFilter);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as ChangeRequestRow[];
      setItems(rows);

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

  useEffect(() => {
    if (projectFilter !== 'all' && !projects.some((p) => p.id === projectFilter)) {
      setProjectFilter('all');
    }
  }, [projects, projectFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, projectFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!profile) return;

    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    if (selectedRequest?.id === id) {
      setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }

    const { error } = await (supabase as any)
      .from('change_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      await load();
      return;
    }
    toast.success('Status updated');
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
    await load();
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
    await load();
  };

  return (
    <AdminLayout>
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4 md:p-6 lg:p-8 pb-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold shrink-0">Change Requests</h1>
        <p className="mt-1 shrink-0 text-xs sm:text-sm text-muted-foreground">
          Drag cards between columns to update status. Click a card for details.
        </p>

        <div className="mt-4 flex shrink-0 flex-col sm:flex-row flex-wrap gap-3">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 w-full sm:w-52">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Change Request">Change Request</SelectItem>
              <SelectItem value="Feedback">Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 min-h-0 flex-1">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No change requests</div>
          ) : (
            <div className="h-[68vh] min-h-[420px]">
              <ChangeRequestsKanbanView
                requests={items}
                onRequestClick={(r) => {
                  setSelectedRequest(r);
                  setIsPanelOpen(true);
                }}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>
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
        onRefresh={load}
      />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Request</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Change Request</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to delete this change request? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminChangeRequests;
