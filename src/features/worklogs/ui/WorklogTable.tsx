import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Worklog } from '@/features/worklogs/services/worklogService';
import { useAuth } from '@/contexts/AuthContext';

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
  const isSales = profile?.role === 'Sales';

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-4">
                <Checkbox
                  checked={selectedIds.size === worklogs.length && worklogs.length > 0}
                  onCheckedChange={onToggleAllSelection}
                />
              </th>
              <th className="text-left p-4 font-semibold">Date</th>
              <th className="text-left p-4 font-semibold">Project</th>
              <th className="text-left p-4 font-semibold">Task</th>
              <th className="text-left p-4 font-semibold">Type</th>
              <th className="text-left p-4 font-semibold">Hours</th>
              <th className="text-left p-4 font-semibold">Description</th>
              {!isSales && <th className="text-left p-4 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {worklogs.length === 0 ? (
              <tr>
                <td colSpan={isSales ? 7 : 8} className="text-center p-8 text-muted-foreground">
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
                    <td className="p-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(log.id)}
                      />
                    </td>
                    <td className="p-4">
                      {format(new Date(log.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-4">{log.projects?.name || '-'}</td>
                    <td className="p-4">{log.tasks?.name || '-'}</td>
                    <td className="p-4">
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
                    <td className="p-4">{log.hours}</td>
                    <td className="p-4">{log.note || '-'}</td>
                    {!isSales && (
                      <td className="p-4">
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

