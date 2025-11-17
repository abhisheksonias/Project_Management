import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface WorklogHistoryHeaderProps {
  onAddWorklog: () => void;
  canEdit?: boolean;
}

export const WorklogHistoryHeader: React.FC<WorklogHistoryHeaderProps> = ({
  onAddWorklog,
  canEdit = true,
}) => {
  if (!canEdit) return <h1 className="text-3xl font-bold">My Time Logs</h1>;

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold">My Time Logs</h1>
      <Button 
        className="bg-primary text-white hover:bg-primary/90"
        onClick={onAddWorklog}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Log Time
      </Button>
    </div>
  );
};

