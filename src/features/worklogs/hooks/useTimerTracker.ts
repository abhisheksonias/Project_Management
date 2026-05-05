import { useState, useEffect, useCallback } from 'react';

interface TimerState {
    startTime: number | null;
    elapsedSeconds: number;
    isRunning: boolean;
    pausedTime: number | null;
}

const TIMER_STORAGE_KEY = 'worklog_timer_state';

export const useTimerTracker = () => {
    const [timerState, setTimerState] = useState<TimerState>(() => {
        // Restore from localStorage if available
        const stored = localStorage.getItem(TIMER_STORAGE_KEY);
        if (stored) {
            try {
                const restored = JSON.parse(stored);
                // If timer was running, calculate elapsed time from stored startTime
                if (restored.isRunning && restored.startTime) {
                    const now = Date.now();
                    const elapsedSinceStart = Math.floor((now - restored.startTime) / 1000);
                    return {
                        ...restored,
                        elapsedSeconds: restored.elapsedSeconds + elapsedSinceStart,
                        startTime: now, // Reset start time to now for continued tracking
                    };
                }
                return restored;
            } catch {
                return {
                    startTime: null,
                    elapsedSeconds: 0,
                    isRunning: false,
                    pausedTime: null,
                };
            }
        }
        return {
            startTime: null,
            elapsedSeconds: 0,
            isRunning: false,
            pausedTime: null,
        };
    });

    // Save to localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
    }, [timerState]);

    // Timer tick effect
    useEffect(() => {
        if (!timerState.isRunning) return;

        const interval = setInterval(() => {
            setTimerState((prev) => ({
                ...prev,
                elapsedSeconds: prev.elapsedSeconds + 1,
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, [timerState.isRunning]);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const start = useCallback(() => {
        setTimerState((prev) => ({
            ...prev,
            isRunning: true,
            startTime: Date.now(),
            pausedTime: null,
        }));
    }, []);

    const pause = useCallback(() => {
        setTimerState((prev) => ({
            ...prev,
            isRunning: false,
            pausedTime: Date.now(),
        }));
    }, []);

    const resume = useCallback(() => {
        setTimerState((prev) => ({
            ...prev,
            isRunning: true,
            startTime: Date.now(),
        }));
    }, []);

    const stop = useCallback(() => {
        const finalElapsed = timerState.elapsedSeconds;
        setTimerState({
            startTime: null,
            elapsedSeconds: 0,
            isRunning: false,
            pausedTime: null,
        });
        return finalElapsed;
    }, [timerState.elapsedSeconds]);

    const reset = useCallback(() => {
        setTimerState({
            startTime: null,
            elapsedSeconds: 0,
            isRunning: false,
            pausedTime: null,
        });
        localStorage.removeItem(TIMER_STORAGE_KEY);
    }, []);

    return {
        elapsedSeconds: timerState.elapsedSeconds,
        isRunning: timerState.isRunning,
        formattedTime: formatTime(timerState.elapsedSeconds),
        start,
        pause,
        resume,
        stop,
        reset,
    };
};
