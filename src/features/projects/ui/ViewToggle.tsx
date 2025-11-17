import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'card' | 'table';
  onViewChange: (view: 'card' | 'table') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('card')}
        className={cn(
          'flex items-center gap-2',
          view === 'card' && 'bg-primary text-white hover:bg-primary/90'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Card View
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
        Table View
      </Button>
    </div>
  );
};

