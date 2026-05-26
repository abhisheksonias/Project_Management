import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { UserPageLayout } from '@/shared/ui/UserPageLayout';
import { SharedTablesList } from '@/features/shared-tables/ui/SharedTablesList';
import { SharedTableView } from '@/features/shared-tables/ui/SharedTableView';
import { CreateTableDialog } from '@/features/shared-tables/ui/CreateTableDialog';
import { AddColumnDialog } from '@/features/shared-tables/ui/AddColumnDialog';
import { useSharedTable, useDeleteColumn } from '@/features/shared-tables/hooks/useSharedTables';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const SharedTables: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isUserRoute = location.pathname.startsWith('/user/');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const { data: table, isLoading } = useSharedTable(selectedTableId);
  const deleteColumnMutation = useDeleteColumn();

  const handleSidebarNavigation = (tab: string) => {
    if (tab === 'dashboard') {
      navigate('/user/dashboard');
    } else if (tab === 'calendar') {
      navigate('/user/calendar');
    } else if (tab === 'worklog-history') {
      navigate('/user/worklog-history');
    } else if (tab === 'projects') {
      navigate('/user/projects');
    } else if (tab === 'tasks') {
      navigate('/user/tasks');
    } else if (tab === 'task-tracker') {
      navigate('/user/task-tracker');
    } else if (tab === 'reports') {
      navigate('/user/reports');
    } else if (tab === 'shared-tables') {
      navigate('/user/shared-tables');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    } else if (tab === 'change-requests') {
      navigate('/user/change-requests');
    }
  };

  const handleTableClick = (tableId: string) => {
    setSelectedTableId(tableId);
  };

  const handleBack = () => {
    setSelectedTableId(null);
  };

  const handleAddColumn = () => {
    setAddColumnDialogOpen(true);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (confirm('Are you sure you want to delete this column? All cell data will be lost.')) {
      deleteColumnMutation.mutate(columnId);
    }
  };

  const content = (
    <>
      {selectedTableId && table ? (
        <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
          <div className="bg-card border-b border-border px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="rounded-[14px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tables
              </Button>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              {table.name}
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <SharedTableView
              table={table}
              isReadOnly={!table.allow_user_edit}
              onAddColumn={handleAddColumn}
              onDeleteColumn={handleDeleteColumn}
            />
          </div>
          {addColumnDialogOpen && (
            <AddColumnDialog
              open={addColumnDialogOpen}
              onOpenChange={setAddColumnDialogOpen}
              tableId={table.id}
            />
          )}
        </div>
      ) : selectedTableId && isLoading ? (
        <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <Skeleton className="h-[600px] w-full rounded-[14px]" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
          <div className="bg-card border-b border-border px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  Shared Tables
                </h1>
                <p className="mt-1 text-xs sm:text-sm md:text-base text-muted-foreground">
                  Create and manage Excel-like shared tables
                </p>
              </div>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="rounded-[14px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Table
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <SharedTablesList
              onCreateTable={() => setCreateDialogOpen(true)}
              onTableClick={handleTableClick}
            />
          </div>
          <CreateTableDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          />
        </div>
      )}
    </>
  );

  if (isUserRoute) {
    return (
      <UserPageLayout
        sidebar={<UserSidebar currentTab="shared-tables" onTabChange={handleSidebarNavigation} />}
      >
        {content}
      </UserPageLayout>
    );
  }

  return <AdminLayout>{content}</AdminLayout>;
};

export default SharedTables;

