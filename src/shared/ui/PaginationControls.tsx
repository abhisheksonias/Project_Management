import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-6">
      {/* Mobile: Circular arrow button, Desktop: Text button */}
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10 sm:rounded-[14px] sm:h-auto sm:w-auto sm:px-4"
        onClick={handlePrevious}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-5 w-5 sm:hidden" />
        <span className="hidden sm:inline text-sm">Previous</span>
      </Button>

      <p className="text-xs sm:text-sm text-muted-foreground text-center min-w-[80px] sm:min-w-auto">
        Page {currentPage} of {totalPages}
      </p>

      {/* Mobile: Circular arrow button, Desktop: Text button */}
      <Button
        size="icon"
        className="rounded-full h-10 w-10 sm:rounded-[14px] sm:h-auto sm:w-auto sm:px-4"
        onClick={handleNext}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-5 w-5 sm:hidden" />
        <span className="hidden sm:inline text-sm">Next</span>
      </Button>
    </div>
  );
};


