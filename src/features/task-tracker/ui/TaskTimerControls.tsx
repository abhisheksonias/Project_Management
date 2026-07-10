import React from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskTimerControlsProps {
  isActive: boolean;
  elapsedLabel?: string;
  onStart: () => void;
  onStop: () => void;
  compact?: boolean;
}

export const TaskTimerControls: React.FC<TaskTimerControlsProps> = ({
  isActive,
  elapsedLabel,
  onStart,
  onStop,
  compact = false,
}) => {
  const handleClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 shrink-0 rounded-full',
          isActive && 'text-primary hover:text-primary'
        )}
        onClick={(e) => handleClick(e, isActive ? onStop : onStart)}
        title={isActive ? `Stop timer (${elapsedLabel})` : 'Start timer'}
      >
        {isActive ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <Play className="h-3 w-3 fill-current" />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isActive ? (
        <Button
          variant="outline"
          size="sm"
          className="rounded-[14px] text-xs sm:text-sm h-8 sm:h-9"
          onClick={(e) => handleClick(e, onStop)}
        >
          <Square className="mr-1.5 h-3.5 w-3.5 fill-current" />
          Stop{elapsedLabel ? ` · ${elapsedLabel}` : ''}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="rounded-[14px] text-xs sm:text-sm h-8 sm:h-9"
          onClick={(e) => handleClick(e, onStart)}
        >
          <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
          Start timer
        </Button>
      )}
    </div>
  );
};
