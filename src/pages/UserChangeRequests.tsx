import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { UserPageLayout } from '@/shared/ui/UserPageLayout';
import { AdminChangeRequestDetailsPanel } from '@/features/admin/ui/AdminChangeRequestDetailsPanel';
import { ChangeRequestsKanbanView } from '@/features/changeRequests/ui/ChangeRequestsKanbanView';
import { ChangeRequestRow } from '@/features/changeRequests/types';
import { userService } from '@/features/users/services/userService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const UserChangeRequests: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [involvementFilter, setInvolvementFilter] = useState<'All' | 'Included Projects'>('All');
  const [assignedProjectIds, setAssignedProjectIds] = useState<Set<string>>(new Set());
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestRow | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch all users for mention autocomplete
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
  });

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const isInvolvedProject = (projectId: string) => assignedProjectIds.has(projectId);

  const loadAssignedProjects = async () => {
    if (!profile?.id) {
      setAssignedProjectIds(new Set());
      return;
    }

    try {
      const { data: assigneesData, error: assigneesError } = await (supabase as any)
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', profile.id);
      if (assigneesError) throw assigneesError;

      const taskIds = (assigneesData || []).map((a: { task_id: string }) => a.task_id);
      if (taskIds.length === 0) {
        setAssignedProjectIds(new Set());
        return;
      }

      const { data: tasksData, error: tasksError } = await (supabase as any)
        .from('tasks')
        .select('project_id')
        .in('id', taskIds);
      if (tasksError) throw tasksError;

      const projectIds = new Set(
        (tasksData || [])
          .map((t: { project_id?: string | null }) => t.project_id)
          .filter((id: string | null | undefined): id is string => !!id)
      );
      setAssignedProjectIds(projectIds);
    } catch (err) {
      console.error('Failed to load assigned projects', err);
      setAssignedProjectIds(new Set());
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const q = (supabase as any)
        .from('change_requests')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'All') {
        q.eq('status', statusFilter);
      }
      if (typeFilter !== 'All') {
        q.eq('request_type', typeFilter === 'Feedback' ? 'feedback' : 'change_request');
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
      const prioritizedRows = visibleRows.sort((a, b) => {
        const aPriority = assignedProjectIds.has(a.project_id) ? 0 : 1;
        const bPriority = assignedProjectIds.has(b.project_id) ? 0 : 1;
        return aPriority - bPriority;
      });
      const finalRows =
        involvementFilter === 'Included Projects'
          ? prioritizedRows.filter((r) => assignedProjectIds.has(r.project_id))
          : prioritizedRows;

      setItems(finalRows);
      if (selectedRequest) {
        const fresh = finalRows.find((r) => r.id === selectedRequest.id);
        if (fresh) setSelectedRequest(fresh);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, involvementFilter, assignedProjectIds]);

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
      load();
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
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!profile) {
      toast.error('Not authenticated');
      return;
    }

    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    if (selectedRequest?.id === id) {
      setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }

    try {
      const { error } = await (supabase as any)
        .from('change_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      toast.success('Status updated');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to update status');
      load();
    }
  };

  const handleSidebarNavigation = (tab: string) => {
    if (tab === 'dashboard') navigate('/user/dashboard');
    else if (tab === 'calendar') navigate('/user/calendar');
    else if (tab === 'worklog-history') navigate('/user/worklog-history');
    else if (tab === 'projects') navigate('/user/projects');
    else if (tab === 'tasks') navigate('/user/tasks');
    else if (tab === 'reports') navigate('/user/reports');
    else if (tab === 'shared-tables') navigate('/user/shared-tables');
    else if (tab === 'settings') navigate('/user/profile');
    else if (tab === 'change-requests') navigate('/user/change-requests');
  };

  return (
    <UserPageLayout
      sidebar={<UserSidebar currentTab="change-requests" onTabChange={handleSidebarNavigation} />}
    >
      <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
        <h1 className="text-xl sm:text-2xl font-semibold mb-2">Change Requests</h1>
        <p className="text-sm text-muted-foreground mb-4">Review change requests. Accept, reject or update status.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
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
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="Change Request">Change Request</SelectItem>
            <SelectItem value="Feedback">Feedback</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={involvementFilter}
          onValueChange={(v: 'All' | 'Included Projects') => {
            setInvolvementFilter(v);
          }}
        >
          <SelectTrigger className="h-8 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Included Projects">Included Projects</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No change requests</div>
      ) : (
        <div className="h-[68vh] min-h-[420px]">
          <ChangeRequestsKanbanView
            requests={items}
            onStatusChange={handleStatusChange}
            onRequestClick={(r) => {
              setSelectedRequest(r);
              setIsPanelOpen(true);
            }}
          />
        </div>
      )}

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

      <AdminChangeRequestDetailsPanel
        request={selectedRequest}
        open={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedRequest(null);
        }}
        currentUser={profile ? { id: profile.id, name: profile.name } : null}
        allUsers={allUsers}
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
      </div>
    </UserPageLayout>
  );
};

export default UserChangeRequests;

