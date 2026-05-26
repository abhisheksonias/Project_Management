/**
 * Convert elapsed seconds to HH:MM format (hours:minutes)
 * Rounding: Uses nearest minute (standard time tracking practice)
 * Example: 3 hours 5 minutes 30 seconds → "03:05" (rounds to nearest minute)
 */
export const secondsToHHMM = (seconds: number): string => {
    // Round to nearest minute
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Convert elapsed seconds to decimal hours (for hours_num field)
 * Example: 3 hours 30 minutes = 3.5
 */
export const secondsToDecimalHours = (seconds: number): number => {
    return Math.round((seconds / 3600) * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate worklog hours from start_time and end_time timestamps
 * Returns both HH:MM format and decimal hours
 */
export const calculateWorklogHoursFromTimestamps = (
    startTime: string,
    endTime: string
): { hours: string; hours_num: number } => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (end <= start) {
        return { hours: '00:00', hours_num: 0 };
    }

    const elapsedSeconds = Math.floor((end - start) / 1000);

    return {
        hours: secondsToHHMM(elapsedSeconds),
        hours_num: secondsToDecimalHours(elapsedSeconds),
    };
};

/**
 * Calculate worklog hours from elapsed seconds (timer-based)
 * Returns both HH:MM format and decimal hours
 */
export const calculateWorklogHoursFromElapsed = (
    elapsedSeconds: number
): { hours: string; hours_num: number } => {
    return {
        hours: secondsToHHMM(elapsedSeconds),
        hours_num: secondsToDecimalHours(elapsedSeconds),
    };
};
