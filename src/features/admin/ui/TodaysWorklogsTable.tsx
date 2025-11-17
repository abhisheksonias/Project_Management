import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { AdminWorklog } from '../services/adminWorklogService';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Edit2, Trash2 } from 'lucide-react';
import { normalizeHoursToHHMM } from '@/shared/utils/formatHours';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AdminEditWorklogDialog } from './AdminEditWorklogDialog';
import { useDeleteWorklog } from '../hooks/useAdminWorklogs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Project } from '@/features/projects/services/projectService';
import { User as UserType } from '@/features/users/services/userService';

interface TodaysWorklogsTableProps {
  worklogs: AdminWorklog[];
  isLoading: boolean;
  projects?: Project[];
  users?: UserType[];
}

const formatHours = (hours: string) => {
  if (!hours) return '00:00';
  // Normalize to HH:MM format
  return normalizeHoursToHHMM(hours);
};

export const TodaysWorklogsTable: React.FC<TodaysWorklogsTableProps> = ({
  worklogs,
  isLoading,
  projects = [],
  users = [],
}) => {
  const [selectedWorklog, setSelectedWorklog] = useState<AdminWorklog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingWorklogId, setDeletingWorklogId] = useState<string | null>(null);
  const [clickedRowId, setClickedRowId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deleteWorklogMutation = useDeleteWorklog();

  // Update tooltip position when hovering
  useEffect(() => {
    if (hoveredRowId && !clickedRowId && containerRef.current) {
      // Use setTimeout to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        const rowElement = document.getElementById(`worklog-row-${hoveredRowId}`);
        if (rowElement && containerRef.current) {
          const rect = rowElement.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          setTooltipPosition({
            top: rect.top - containerRect.top - 10,
            left: rect.left - containerRect.left + rect.width / 2,
          });
        }
      }, 50); // Small delay to ensure DOM is updated
      
      return () => clearTimeout(timeoutId);
    } else {
      setTooltipPosition(null);
    }
  }, [hoveredRowId, clickedRowId]);
  if (isLoading) {
    return (
      <Card className="p-6 rounded-[14px] bg-white">
        <h3 className="text-lg font-semibold mb-4">Today's Worklogs</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-[14px]" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-[14px] bg-white flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Today's Worklogs</h3>
        <span className="text-sm text-muted-foreground">
          Showing {worklogs.length} {worklogs.length === 1 ? 'log' : 'logs'}
        </span>
      </div>
      {worklogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No worklogs found for today</p>
        </div>
      ) : (
        <div ref={containerRef} className="overflow-x-auto overflow-y-auto max-h-[400px] flex-1 relative">
          <table className="w-full">
            <thead className="bg-secondary sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-l-[14px]">
                  User
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Project
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide">
                  Task
                </th>
                <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide rounded-r-[14px]">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {worklogs.map((log) => {
                const hasNote = log.note && log.note.trim().length > 0;
                
                return (
                  <Popover key={log.id} open={clickedRowId === log.id} onOpenChange={(open) => {
                    if (!open) {
                      setClickedRowId(null);
                      setHoveredRowId(null);
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <tr
                        id={`worklog-row-${log.id}`}
                        className={cn(
                          "border-b border-secondary/30 hover:bg-secondary/30 transition-colors cursor-pointer relative",
                          clickedRowId === log.id && "bg-secondary/50"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setClickedRowId(log.id);
                          setHoveredRowId(null); // Hide tooltip on click
                        }}
                        onMouseEnter={() => {
                          if (!clickedRowId) {
                            setHoveredRowId(log.id);
                          }
                        }}
                        onMouseLeave={() => {
                          if (clickedRowId !== log.id) {
                            setHoveredRowId(null);
                          }
                        }}
                      >
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{log.user?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{log.project?.name || '—'}</td>
                        <td className="p-3 text-sm">{log.task?.name || '—'}</td>
                        <td className="p-3 text-sm font-semibold text-primary">
                          {formatHours(log.hours)}
                        </td>
                      </tr>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-48 p-1 rounded-[14px]"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          className="w-full justify-start rounded-[14px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorklog(log);
                            setIsEditDialogOpen(true);
                            setClickedRowId(null);
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start rounded-[14px] text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingWorklogId(log.id);
                            setClickedRowId(null);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </tbody>
          </table>
          {/* Custom tooltip overlay - appears on hover */}
          {hoveredRowId && tooltipPosition && !clickedRowId && (() => {
            const log = worklogs.find((l) => l.id === hoveredRowId);
            if (!log) return null;
            const hasNote = log.note && log.note.trim().length > 0;
            
            return (
              <div
                className="absolute z-[100] bg-popover border border-border rounded-[14px] shadow-md p-3 max-w-md pointer-events-none"
                style={{
                  left: `${tooltipPosition.left}px`,
                  top: `${tooltipPosition.top}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {hasNote ? log.note : 'Note not added'}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* Edit Dialog */}
      <AdminEditWorklogDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        worklog={selectedWorklog}
        projects={projects}
        users={users}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          setSelectedWorklog(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingWorklogId}
        onOpenChange={(open) => {
          if (!open) setDeletingWorklogId(null);
        }}
      >
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worklog</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this worklog? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[14px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingWorklogId) {
                  deleteWorklogMutation.mutate(deletingWorklogId, {
                    onSuccess: () => {
                      setDeletingWorklogId(null);
                    },
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700 rounded-[14px]"
              disabled={deleteWorklogMutation.isPending}
            >
              {deleteWorklogMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

