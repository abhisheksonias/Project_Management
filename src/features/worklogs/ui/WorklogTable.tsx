import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { stripHtml } from '@/shared/utils/htmlUtils';
import { cn } from '@/lib/utils';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface WorklogTableProps {
  worklogs: Worklog[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAllSelection: () => void;
  onEdit: (log: Worklog) => void;
  onDelete: (id: string) => void;
}

export const WorklogTable: React.FC<WorklogTableProps> = ({
  worklogs,
  selectedIds,
  onToggleSelection,
  onToggleAllSelection,
  onEdit,
  onDelete,
}) => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const isSales = profile?.role === 'Sales';

  // Mobile Card Layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {worklogs.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-sm text-muted-foreground">
              No time logs found
            </div>
          </Card>
        ) : (
          worklogs.map((log) => {
            const isSelected = selectedIds.has(log.id);
            const logType = log.tasks?.type || '';
            const isBillable = logType.toLowerCase() === 'billable';

            return (
              <Card
                key={log.id}
                className={cn(
                  'p-3 cursor-pointer hover:shadow-md transition-shadow',
                  isSelected && 'bg-primary/5 border-primary'
                )}
                onClick={() => onToggleSelection(log.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(log.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{log.projects?.name || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.tasks?.name || '-'}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                      isBillable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {logType || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                  <span className="font-semibold text-foreground">{log.hours}</span>
                </div>
                {log.note && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{stripHtml(log.note)}</p>
                )}
                {!isSales && (
                  <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-secondary text-xs"
                      onClick={() => onEdit(log)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-destructive/10 text-destructive text-xs"
                      onClick={() => onDelete(log.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    );
  }

  // Desktop Table Layout
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 sm:p-4">
                <Checkbox
                  checked={selectedIds.size === worklogs.length && worklogs.length > 0}
                  onCheckedChange={onToggleAllSelection}
                />
              </th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Date</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Project</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Task</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Type</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Hours</th>
              <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Description</th>
              {!isSales && <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {worklogs.length === 0 ? (
              <tr>
                <td colSpan={isSales ? 7 : 8} className="text-center p-8 text-sm text-muted-foreground">
                  No time logs found
                </td>
              </tr>
            ) : (
              worklogs.map((log) => {
                const isSelected = selectedIds.has(log.id);
                const logType = log.tasks?.type || '';
                const isBillable = logType.toLowerCase() === 'billable';

                return (
                  <tr
                    key={log.id}
                    className={cn(
                      'border-b border-secondary hover:bg-secondary/30 transition-colors',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <td className="p-3 sm:p-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(log.id)}
                      />
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">
                      {format(new Date(log.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">{log.projects?.name || '-'}</td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">{log.tasks?.name || '-'}</td>
                    <td className="p-3 sm:p-4">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          isBillable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {logType}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">{log.hours}</td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm max-w-[200px] truncate">{log.note || '-'}</td>
                    {!isSales && (
                      <td className="p-3 sm:p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-secondary"
                            onClick={() => onEdit(log)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                            onClick={() => onDelete(log.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

