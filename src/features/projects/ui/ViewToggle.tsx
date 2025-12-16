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
    <div className="flex hidden sm:flex items-center gap-1 sm:gap-2 bg-secondary rounded-lg p-0.5 sm:p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('card')}
        className={cn(
          'flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9',
          view === 'card' && 'bg-primary text-white hover:bg-primary/90'
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Card View</span>
        <span className="sm:hidden">Card</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('table')}
        className={cn(
          'flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9',
          view === 'table' && 'bg-primary text-white hover:bg-primary/90'
        )}
      >
        <Table className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Table View</span>
        <span className="sm:hidden">Table</span>
      </Button>
    </div>
  );
};

