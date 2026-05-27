import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChangeRequestRow } from '@/features/changeRequests/types';

const STATUS_COLUMNS = [
  { id: 'Open', label: 'Open', color: 'bg-slate-100 text-slate-800' },
  { id: 'To Do', label: 'To Do', color: 'bg-blue-100 text-blue-800' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'Review', label: 'Review', color: 'bg-purple-100 text-purple-800' },
  { id: 'Blocked', label: 'Blocked', color: 'bg-orange-100 text-orange-800' },
  { id: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { id: 'Rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
] as const;

const normalizeStatus = (raw: string | null | undefined): string => {
  if (!raw) return 'Open';
  const exact = STATUS_COLUMNS.find((col) => col.id === raw);
  if (exact) return exact.id;
  const lower = raw.toLowerCase().trim();
  if (lower === 'open') return 'Open';
  if (lower === 'accepted') return 'To Do';
  if (lower === 'todo' || lower === 'to-do' || lower === 'to do') return 'To Do';
  if (lower === 'in progress' || lower === 'in-progress' || lower === 'inprogress') return 'In Progress';
  if (lower === 'completed' || lower === 'done' || lower === 'complete') return 'Completed';
  if (lower === 'blocked') return 'Blocked';
  if (lower === 'review' || lower === 'in review') return 'Review';
  if (lower === 'rejected') return 'Rejected';
  return 'Open';
};

interface ChangeRequestsKanbanViewProps {
  requests: ChangeRequestRow[];
  onRequestClick?: (request: ChangeRequestRow) => void;
  onStatusChange?: (requestId: string, newStatus: string) => void;
}

export const ChangeRequestsKanbanView: React.FC<ChangeRequestsKanbanViewProps> = ({
  requests,
  onRequestClick,
  onStatusChange,
}) => {
  const [draggedRequest, setDraggedRequest] = useState<ChangeRequestRow | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const requestsByStatus = useMemo(() => {
    const grouped: Record<string, ChangeRequestRow[]> = {};
    STATUS_COLUMNS.forEach((col) => {
      grouped[col.id] = [];
    });

    requests.forEach((request) => {
      const status = normalizeStatus(request.status);
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(request);
    });

    return grouped;
  }, [requests]);

  const handleDragStart = (e: React.DragEvent, request: ChangeRequestRow) => {
    setDraggedRequest(request);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', request.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);

    if (
      draggedRequest &&
      normalizeStatus(draggedRequest.status) !== targetColumnId &&
      onStatusChange
    ) {
      onStatusChange(draggedRequest.id, targetColumnId);
    }

    setDraggedRequest(null);
  };

  const handleDragEnd = () => {
    setDraggedRequest(null);
    setDraggedOverColumn(null);
  };

  return (
    <div className="h-full w-full overflow-x-auto pb-4">
      <div className="flex h-full min-h-0 min-w-max items-stretch gap-2 sm:gap-3 md:gap-4 px-1 sm:px-2">
        {STATUS_COLUMNS.map((column) => {
          const columnRequests = requestsByStatus[column.id] || [];
          const isDraggedOver = draggedOverColumn === column.id;

          return (
            <div
              key={column.id}
              className="flex h-full min-h-0 w-[220px] shrink-0 flex-col sm:w-[240px] md:w-[260px]"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <Card
                className={cn(
                  'flex h-full min-h-0 flex-col transition-colors',
                  isDraggedOver && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-2 sm:p-3">
                  <div className="mb-2 flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <Badge className={cn('text-[10px] sm:text-xs', column.color)}>{column.label}</Badge>
                    <span className="text-xs text-muted-foreground">({columnRequests.length})</span>
                  </div>

                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 sm:space-y-2">
                    {columnRequests.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-secondary py-6 text-center text-xs text-muted-foreground sm:py-8 sm:text-sm">
                        Drop here
                      </div>
                    ) : (
                      columnRequests.map((request) => (
                        <Card
                          key={request.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, request)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'cursor-move border transition-all hover:shadow-md',
                            draggedRequest?.id === request.id && 'opacity-50'
                          )}
                          onClick={() => {
                            if (!draggedRequest) onRequestClick?.(request);
                          }}
                        >
                          <CardContent className="p-2 sm:p-2.5">
                            <h4 className="line-clamp-2 text-xs font-semibold sm:text-sm">{request.title}</h4>
                            <Badge variant="outline" className="mt-1.5 text-[10px]">
                              {request.request_type === 'feedback' ? 'Feedback' : 'Change Request'}
                            </Badge>
                            <p className="mt-1.5 line-clamp-1 text-[10px] text-muted-foreground sm:text-xs">
                              {request.projects?.name || 'No project'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                              <span className="capitalize">{request.category}</span>
                              {request.created_at && (
                                <>
                                  <span>·</span>
                                  <span>{format(new Date(request.created_at), 'MMM dd, HH:mm')}</span>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};
