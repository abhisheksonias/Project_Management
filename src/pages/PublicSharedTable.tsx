import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicSharedTable } from '@/features/shared-tables/hooks/useSharedTables';
import { SharedTableView } from '@/features/shared-tables/ui/SharedTableView';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PublicSharedTable: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { data: table, isLoading, error } = usePublicSharedTable(token || null);
  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl">
          <Skeleton className="h-[600px] w-full rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="p-8 rounded-[14px] max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Table Not Found</h2>
          <p className="text-muted-foreground">
            This shared table does not exist or is no longer public.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Shared Table */}
        <SharedTableView table={table} isReadOnly={true} />
      </div>
    </div>
  );
};

export default PublicSharedTable;

