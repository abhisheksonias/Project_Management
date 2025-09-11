import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DateFilter, DateFilterValue } from '@/components/ui/date-filter';

interface WorkLog {
  id: string;
  hours: string;
  note: string | null;
  created_at: string;
  projects: { name: string; type: string };
  tasks: { name: string; status: string } | null;
}

interface WorkLogTableProps {
  onEdit?: (workLog: WorkLog) => void;
  onDelete?: (workLogId: string) => void;
  onView?: (workLog: WorkLog) => void;
  className?: string;
}

export const WorkLogTable: React.FC<WorkLogTableProps> = ({
  onEdit,
  onDelete,
  onView,
  className
}) => {
  const { profile } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Initialize date filter with proper Indian timezone handling
  const initializeDateFilter = () => {
    const now = new Date();
    const indianTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const startDate = new Date(indianTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(indianTime);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      type: 'today' as const,
      startDate,
      endDate
    };
  };

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initializeDateFilter());

  const fetchWorkLogs = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          id,
          hours,
          note,
          created_at,
          projects(name, type),
          tasks(name, status)
        `)
        .eq('user_id', profile.id)
        .gte('created_at', dateFilter.startDate.toISOString())
        .lte('created_at', dateFilter.endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error fetching work logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load work logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkLogs();
  }, [profile?.id, dateFilter]);

  const handleDelete = async (workLogId: string) => {
    if (!confirm('Are you sure you want to delete this work log?')) return;

    try {
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', workLogId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Work log deleted successfully',
      });

      // Refresh the list
      fetchWorkLogs();
      
      if (onDelete) {
        onDelete(workLogId);
      }
    } catch (error) {
      console.error('Error deleting work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete work log',
        variant: 'destructive',
      });
    }
  };

  const formatDuration = (hours: string) => {
    if (!hours) return '0h';
    const [hoursStr, minutesStr] = hours.split(':');
    const hoursCount = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    if (minutes === 0) {
      return `${hoursCount}h`;
    }
    return `${hoursCount}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeBadge = (type: string) => {
    const isBillable = type?.toLowerCase() === 'billable';
    return (
      <Badge variant={isBillable ? "default" : "secondary"}>
        {isBillable ? 'Billable' : 'Non-billable'}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    
    switch (statusLower) {
      case 'completed':
        variant = "default";
        break;
      case 'in progress':
        variant = "secondary";
        break;
      case 'pending':
        variant = "outline";
        break;
      case 'blocked':
        variant = "destructive";
        break;
    }

    return (
      <Badge variant={variant}>
        {status || 'Unknown'}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Work Log</CardTitle>
            <CardDescription>
              Your work logs for the selected period
            </CardDescription>
          </div>
          <DateFilter
            value={dateFilter}
            onChange={setDateFilter}
            onRefresh={fetchWorkLogs}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading work logs...</div>
          </div>
        ) : workLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-muted-foreground mb-2">No work logs found</div>
              <div className="text-sm text-muted-foreground">
                Try adjusting your date filter or add a new work log
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {workLogs.map((workLog) => (
              <Card key={workLog.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                    <div className="col-span-2">
                      <div className="font-medium text-sm">
                        {workLog.tasks?.name || 'No Task'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {workLog.projects?.name || 'Unknown Project'}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {getTypeBadge(workLog.projects?.type || 'non-billable')}
                    </div>
                    <div className="col-span-1">
                      {workLog.tasks?.status ? getStatusBadge(workLog.tasks.status) : '-'}
                    </div>
                    <div className="col-span-1">
                      <div className="font-medium text-sm">
                        {formatDuration(workLog.hours)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(workLog.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(workLog)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(workLog)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(workLog.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {workLog.note && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Note:</span> {workLog.note}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
