import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerWidgetProps {
    elapsedSeconds: number;
    isRunning: boolean;
    formattedTime: string;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: (elapsedSeconds: number) => void;
    onReset: () => void;
    disabled?: boolean;
    className?: string;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
    isRunning,
    formattedTime,
    onStart,
    onPause,
    onResume,
    onStop,
    onReset,
    elapsedSeconds,
    disabled = false,
    className,
}) => {
    const hasElapsed = elapsedSeconds > 0;

    const handlePlayPause = () => {
        if (!isRunning && elapsedSeconds === 0) {
            onStart();
        } else if (isRunning) {
            onPause();
        } else {
            onResume();
        }
    };

    return (
        <div className={cn('flex flex-col items-center justify-center gap-4 p-6 rounded-lg border bg-card', className)}>
            {/* Timer Display */}
            <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">Elapsed Time</p>
                <div
                    className={cn(
                        'text-6xl font-bold font-mono tracking-tight',
                        isRunning ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                    )}
                >
                    {formattedTime}
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3">
                <Button
                    onClick={handlePlayPause}
                    disabled={disabled}
                    variant={isRunning ? 'destructive' : 'default'}
                    size="lg"
                    className="min-w-32"
                >
                    {isRunning ? (
                        <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                        </>
                    ) : elapsedSeconds === 0 ? (
                        <>
                            <Play className="mr-2 h-4 w-4" />
                            Start
                        </>
                    ) : (
                        <>
                            <Play className="mr-2 h-4 w-4" />
                            Resume
                        </>
                    )}
                </Button>

                {hasElapsed && (
                    <>
                        <Button
                            onClick={() => onStop(elapsedSeconds)}
                            disabled={disabled || isRunning}
                            variant="outline"
                            size="lg"
                            className="min-w-32"
                        >
                            Stop & Log
                        </Button>

                        <Button
                            onClick={onReset}
                            disabled={disabled || isRunning}
                            variant="ghost"
                            size="lg"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>

            {/* Help Text */}
            {elapsedSeconds === 0 && !isRunning && (
                <p className="text-xs text-muted-foreground text-center">
                    Click Start to begin tracking time
                </p>
            )}
            {hasElapsed && !isRunning && (
                <p className="text-xs text-muted-foreground text-center">
                    Click Stop & Log to save this worklog
                </p>
            )}
        </div>
    );
};
