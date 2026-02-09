import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface ChangeRequestRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: string;
  attachment_urls?: string[] | null;
  reference_links?: string[] | null;
  status: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  projects?: { name: string } | null;
  converted_task_id?: string | null;
  task_status?: string | null;
  effective_status?: string | null;
}

const AdminChangeRequests: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('change_requests')
        .select('*, projects(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows: ChangeRequestRow[] = (data || []) as ChangeRequestRow[];

      // If any have converted_task_id, fetch task statuses in batch
      const convertedIds = Array.from(new Set(rows.map(r => r.converted_task_id).filter(Boolean))) as string[];
      if (convertedIds.length > 0) {
        const { data: tasksData, error: tasksErr } = await (supabase as any)
          .from('tasks')
          .select('id,status')
          .in('id', convertedIds);
        if (!tasksErr && tasksData) {
          const taskMap = new Map<string, string>();
          tasksData.forEach((t: any) => taskMap.set(t.id, t.status));
          rows.forEach(r => {
            if (r.converted_task_id) {
              r.task_status = taskMap.get(r.converted_task_id) ?? null;
              // compute effective_status based on task_status if available
              const ts = (r.task_status || '').toLowerCase();
              if (!r.task_status) {
                r.effective_status = r.status;
              } else if (ts === 'to do' || ts === 'todo') {
                r.effective_status = 'accepted';
              } else if (ts === 'in progress') {
                r.effective_status = 'in_progress';
              } else if (ts === 'review') {
                r.effective_status = 'review';
              } else if (ts === 'completed') {
                r.effective_status = 'completed';
              } else {
                r.effective_status = r.status;
              }
            } else {
              r.task_status = null;
              r.effective_status = r.status;
            }
          });
        }
      }

      setItems(rows);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReject = async (id: string) => {
    if (!confirm('Reject this change request?')) return;
    try {
      const { error } = await (supabase as any)
        .from('change_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Request rejected');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject');
    }
  };

  const handleConvert = async (r: ChangeRequestRow) => {
    if (!profile) {
      toast.error('Admin not authenticated');
      return;
    }

    if (!confirm('Convert this change request into a task?')) return;

    try {
      // Create minimal task
      const taskPayload: any = {
        name: r.title,
        description: `${r.description}\n\n(Origin: Change Request ${r.id})`,
        status: 'To Do',
        priority: 'Medium',
        project_id: r.project_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdTask, error: taskError } = await (supabase as any)
        .from('tasks')
        .insert(taskPayload)
        .select('id')
        .single();
      if (taskError) throw taskError;

      const createdTaskId = createdTask?.id;

      // Mark change request converted and attach converted_task_id
      const { error: updError } = await (supabase as any)
        .from('change_requests')
        .update({ status: 'converted', converted_task_id: createdTaskId, updated_at: new Date().toISOString(), reference_links: r.reference_links ?? null })
        .eq('id', r.id);
      if (updError) throw updError;

      // record status history for the change_request
      const { error: histErr } = await (supabase as any)
        .from('status_history')
        .insert({
          entity_type: 'change_request',
          entity_id: r.id,
          status: 'converted',
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        });
      if (histErr) console.error('status_history insert failed', histErr);

      toast.success('Converted to task');
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to convert');
    }
  };

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

      // record in status_history
      const { error: histErr } = await (supabase as any)
        .from('status_history')
        .insert({
          entity_type: 'change_request',
          entity_id: id,
          status: newStatus,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        });
      if (histErr) throw histErr;

      toast.success('Status updated');
      load();
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
            <p className="text-sm text-muted-foreground mb-4">Review incoming client change requests. Convert to task or reject.</p>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No change requests</div>
            ) : (
              <div className="space-y-4">
                {items.map((r) => (
                  <div key={r.id} className="border rounded p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.category} • {r.projects?.name || 'No project'} • {r.created_at ? format(new Date(r.created_at), 'Pp') : ''}
                      </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(v) => handleStatusChange(r.id, v)} value={r.status}>
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                          </SelectContent>
                        </Select>
                        <button onClick={() => handleConvert(r)} className="px-3 py-1 bg-primary text-white rounded text-sm">Convert</button>
                        <button onClick={() => handleReject(r.id)} className="px-3 py-1 border rounded text-sm text-destructive">Reject</button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">{r.description}</div>

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
                                <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                                  <img src={u} alt={`att-${i}`} className="h-24 w-full object-cover rounded" />
                                </a>
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
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChangeRequests;

