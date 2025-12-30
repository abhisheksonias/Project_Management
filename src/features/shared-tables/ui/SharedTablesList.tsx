import React, { useState } from 'react';
import { useSharedTables, useDeleteTable } from '../hooks/useSharedTables';
import { PMTable } from '../services/sharedTableService';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ExternalLink, Copy, Eye, Edit, Copy as CopyIcon, Link, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EditTableDialog } from './EditTableDialog';
import { DuplicateTableDialog } from './DuplicateTableDialog';
import { AssignUsersDialog } from './AssignUsersDialog';
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
  const { profile } = useAuth();
  
  // Hide edit/assign/duplicate/delete buttons for User role
  const isUserRole = profile?.role === 'User';
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
  const [assignUsersDialogOpen, setAssignUsersDialogOpen] = useState<{
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <Card
            key={table.id}
            onClick={() => onTableClick(table.id)}
            className="cursor-pointer rounded-[14px] border border-border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-full flex-col justify-between">
              {/* Top section */}
              <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold leading-tight">
                      {table.name}
                    </h3>
                  {table.is_public && (
                    <Badge variant="outline" className="text-xs">
                      Public
                    </Badge>
                  )}
                </div>

                {table.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {table.description}
                  </p>
                  )}
                </div>

                {/* Action buttons */}
                <div
                  className="flex shrink-0 items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isUserRole && (
                    <>
                <Button
                        size="icon"
                  variant="ghost"
                        title="Edit table"
                  onClick={() => setEditDialogOpen({ open: true, table })}
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                        size="icon"
                  variant="ghost"
                        title="Duplicate table"
                  onClick={() => setDuplicateDialogOpen({ open: true, table })}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>

                <Button
                        size="icon"
                  variant="ghost"
                        title="Assign users"
                  onClick={() => setAssignUsersDialogOpen({ open: true, table })}
                >
                  <Users className="h-4 w-4" />
                </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete table"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(table)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                {table.is_public && (
                  <Button
                      size="icon"
                    variant="ghost"
                      title="Copy public link"
                    onClick={() => copyPublicLink(table)}
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                )}
                </div>
              </div>

              {/* Bottom meta */}
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Created {format(new Date(table.created_at), 'MMM d, yyyy')}
                </span>
                {table.allow_user_edit && (
                  <span className="text-green-600">Editable</span>
                )}
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

      <AssignUsersDialog
        open={assignUsersDialogOpen.open}
        onOpenChange={(open) => setAssignUsersDialogOpen({ open, table: null })}
        table={assignUsersDialogOpen.table}
      />
    </>
  );
};

