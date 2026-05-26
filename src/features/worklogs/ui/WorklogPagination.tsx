import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorklogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const WorklogPagination: React.FC<WorklogPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
      <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        Showing {(currentPage - 1) * pageSize + 1} to{' '}
        {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
      </p>
      <div className="flex gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            className={cn(
              'h-8 sm:h-9 text-xs sm:text-sm',
              currentPage === page && 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            {page}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
};

