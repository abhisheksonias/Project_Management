import React from 'react';
import { Button } from '@/components/ui/button';
import { Timer, Square } from 'lucide-react';

interface TaskTrackerBarProps {
  taskName: string;
  elapsedLabel: string;
  onStop: () => void;
}

export const TaskTrackerBar: React.FC<TaskTrackerBarProps> = ({
  taskName,
  elapsedLabel,
  onStop,
}) => {
  return (
    <div className="rounded-[14px] border border-secondary bg-white px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Timer className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground truncate">
            Tracking: <span className="font-semibold">{taskName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono px-2 py-1 rounded-md bg-secondary">{elapsedLabel}</span>
          <Button variant="outline" size="sm" onClick={onStop} className="h-8 rounded-[10px]">
            <Square className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
};

