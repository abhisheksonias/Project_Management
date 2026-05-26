import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface StatusHistoryItem {
  id: string;
  entity_id: string;
  entity_type: 'project' | 'task';
  status: string;
  updated_by: string;
  updated_at: string;
  user_name?: string;
}

interface StatusHistoryProps {
  entityId: string;
  entityType: 'project' | 'task';
  title?: string;
}

export const StatusHistory: React.FC<StatusHistoryProps> = ({
  entityId,
  entityType,
  title = 'Status History'
}) => {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatusHistory();
  }, [entityId, entityType]);

  // SELECT * FROM StatusHistory WHERE project_or_task_id = [id] ORDER BY timestamp ASC
  const fetchStatusHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch status history for the entity
      const { data: statusData, error: statusError } = await supabase
        .from('status_history')
        .select('*')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('updated_at', { ascending: true });

      if (statusError) {
        console.error('Error fetching status history:', statusError);
        setError('Failed to load status history');
        return;
      }

      if (!statusData || statusData.length === 0) {
        setHistory([]);
        return;
      }

      // Fetch user names for all unique updated_by IDs
      const userIds = [...new Set(statusData.map(item => item.updated_by))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        // Continue without user names if there's an error
      }

      // Map user names to status history items
      const historyWithUserNames = statusData.map(item => ({
        ...item,
        user_name: usersData?.find(user => user.id === item.updated_by)?.name || 'Unknown User'
      }));

      setHistory(historyWithUserNames);
    } catch (error) {
      console.error('Error fetching status history:', error);
      setError('Failed to load status history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No status history available</p>
            <p className="text-sm">Status changes will appear here once they occur</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3">
              {/* Timeline dot */}
              <div className="relative">
                <div className="w-3 h-3 bg-primary rounded-full mt-1.5" />
                {index < history.length - 1 && (
                  <div className="absolute top-3 left-1.5 w-px h-8 bg-border" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">{item.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(item.updated_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{item.user_name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
