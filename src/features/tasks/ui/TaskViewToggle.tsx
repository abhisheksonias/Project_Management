import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskViewToggleProps {
  view: 'kanban' | 'table';
  onViewChange: (view: 'kanban' | 'table') => void;
}

export const TaskViewToggle: React.FC<TaskViewToggleProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('kanban')}
        className={cn(
          'flex items-center gap-2',
          view === 'kanban' && 'bg-primary text-white hover:bg-primary/90'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Kanban
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('table')}
        className={cn(
          'flex items-center gap-2',
          view === 'table' && 'bg-primary text-white hover:bg-primary/90'
        )}
      >
        <Table className="h-4 w-4" />
        Table
      </Button>
    </div>
  );
};

