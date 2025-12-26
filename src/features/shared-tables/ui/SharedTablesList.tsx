import React, { useState } from 'react';
import { useSharedTables, useDeleteTable } from '../hooks/useSharedTables';
import { PMTable } from '../services/sharedTableService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ExternalLink, Copy, Eye, Edit, Copy as CopyIcon, Link } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EditTableDialog } from './EditTableDialog';
import { DuplicateTableDialog } from './DuplicateTableDialog';
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
import { Badge } from '@/components/ui/badge';

interface SharedTablesListProps {
  onCreateTable: () => void;
  onTableClick: (tableId: string) => void;
}

export const SharedTablesList: React.FC<SharedTablesListProps> = ({
  onCreateTable,
  onTableClick,
}) => {
  const { data: tables, isLoading } = useSharedTables();
  const deleteTableMutation = useDeleteTable();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<{
    open: boolean;
    table: PMTable | null;
  }>({ open: false, table: null });
  const [editDialogOpen, setEditDialogOpen] = useState<{
    open: boolean;
    table: PMTable | null;
  }>({ open: false, table: null });
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState<{
    open: boolean;
    table: PMTable | null;
  }>({ open: false, table: null });

  const handleDelete = (table: PMTable) => {
    setDeleteDialogOpen({ open: true, table });
  };

  const confirmDelete = () => {
    if (deleteDialogOpen.table) {
      deleteTableMutation.mutate(deleteDialogOpen.table.id);
      setDeleteDialogOpen({ open: false, table: null });
    }
  };

  const copyPublicLink = (table: PMTable) => {
    if (!table.public_token) {
      toast.error('This table is not public');
      return;
    }
    const url = `${window.location.origin}/shared-table/${table.public_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Public link copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[14px]" />
        ))}
      </div>
    );
  }

  if (!tables || tables.length === 0) {
    return (
      <Card className="p-12 rounded-[14px] border-2 border-dashed text-center">
        <p className="text-muted-foreground mb-4">No tables yet</p>
        <Button onClick={onCreateTable} className="rounded-[14px]">
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Table
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tables.map((table) => (
          <Card
            key={table.id}
            className="p-4 rounded-[14px] border border-border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onTableClick(table.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{table.name}</h3>
                  {table.is_public && (
                    <Badge variant="outline" className="text-xs">
                      Public
                    </Badge>
                  )}
                </div>
                {table.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {table.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Created {format(new Date(table.created_at), 'MMM d, yyyy')}
                  </span>
                  {table.allow_user_edit && (
                    <span className="text-green-600">Editable</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditDialogOpen({ open: true, table })}
                  className="h-8 w-8 p-0"
                  title="Edit table"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDuplicateDialogOpen({ open: true, table })}
                  className="h-8 w-8 p-0"
                  title="Duplicate table"
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
                {table.is_public && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyPublicLink(table)}
                    className="h-8 w-8 p-0"
                    title="Copy public link"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(table)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Delete table"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={deleteDialogOpen.open}
        onOpenChange={(open) => setDeleteDialogOpen({ open, table: null })}
      >
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialogOpen.table?.name}"? This action
              cannot be undone and will delete all columns, rows, and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[14px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-[14px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditTableDialog
        open={editDialogOpen.open}
        onOpenChange={(open) => setEditDialogOpen({ open, table: null })}
        table={editDialogOpen.table}
      />

      <DuplicateTableDialog
        open={duplicateDialogOpen.open}
        onOpenChange={(open) => setDuplicateDialogOpen({ open, table: null })}
        table={duplicateDialogOpen.table}
      />
    </>
  );
};

