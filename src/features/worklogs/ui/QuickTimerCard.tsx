import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock } from 'lucide-react';
import { useTimerTracker } from '../hooks/useTimerTracker';

interface QuickTimerCardProps {
    onStartTimerClick: () => void;
    disabled?: boolean;
}

export const QuickTimerCard: React.FC<QuickTimerCardProps> = ({ onStartTimerClick, disabled = false }) => {
    const timer = useTimerTracker();
    const hasActiveTimer = timer.elapsedSeconds > 0;

    return (
        <Card className="border-primary/50 hover:border-primary/80 transition-colors">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                        <CardTitle className="text-lg">Quick Timer</CardTitle>
                        <CardDescription>Track work time on the go</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Timer Display */}
                {hasActiveTimer && (
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Elapsed Time</p>
                        <p className={`text-3xl font-bold font-mono ${timer.isRunning ? 'text-green-600 dark:text-green-400' : ''}`}>
                            {timer.formattedTime}
                        </p>
                    </div>
                )}

                {/* Timer Status */}
                {hasActiveTimer && (
                    <div className="text-sm text-muted-foreground text-center">
                        {timer.isRunning ? '⏱️ Timer is running' : '⏸️ Timer is paused'}
                    </div>
                )}

                {/* Action Button */}
                <Button
                    onClick={onStartTimerClick}
                    disabled={disabled}
                    className="w-full"
                    variant={hasActiveTimer ? 'outline' : 'default'}
                >
                    <Play className="mr-2 h-4 w-4" />
                    {hasActiveTimer ? 'Open Timer' : 'Start Timer'}
                </Button>

                {!hasActiveTimer && (
                    <p className="text-xs text-muted-foreground text-center">
                        Click Start Timer to log work hours
                    </p>
                )}
            </CardContent>
        </Card>
    );
};
