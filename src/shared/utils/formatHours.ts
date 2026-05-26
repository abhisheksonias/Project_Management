/**
 * Converts decimal hours to HH:MM format with leading zero for hours
 * @param hours - Decimal hours (e.g., 40.5) or string in HH:MM format
 * @returns Formatted string (e.g., "40:30" or "08:00")
 */
export function formatHoursToHHMM(hours: number | string): string {
  let decimalHours: number;
  
  if (typeof hours === 'string') {
    // If already in HH:MM format, return as is (after validation)
    if (hours.includes(':')) {
      const [h, m] = hours.split(':');
      const hoursNum = parseInt(h || '0', 10);
      const minutesNum = parseInt(m || '0', 10);
      if (isNaN(hoursNum) || isNaN(minutesNum) || hoursNum < 0 || minutesNum < 0 || minutesNum >= 60) {
        return '00:00';
      }
      return `${hoursNum.toString().padStart(2, '0')}:${minutesNum.toString().padStart(2, '0')}`;
    }
    decimalHours = parseFloat(hours) || 0;
  } else {
    decimalHours = hours;
  }

  if (isNaN(decimalHours) || decimalHours < 0) {
    return '00:00';
  }

  const wholeHours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - wholeHours) * 60);
  
  // Handle case where minutes round to 60
  const finalHours = wholeHours + Math.floor(minutes / 60);
  const finalMinutes = minutes % 60;

  return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
}

/**
 * Normalizes hours string to HH:MM format
 * Accepts decimal (8.5), HH:MM (8:30), or HH:MM with leading zeros (08:30)
 * @param hours - Hours string in various formats
 * @returns Normalized HH:MM format string (e.g., "08:30")
 */
export function normalizeHoursToHHMM(hours: string | number | null | undefined): string {
  if (!hours) return '00:00';
  
  if (typeof hours === 'number') {
    return formatHoursToHHMM(hours);
  }
  
  if (typeof hours === 'string') {
    const trimmed = hours.trim();
    
    // If already in HH:MM format
    if (trimmed.includes(':')) {
      const [h, m] = trimmed.split(':');
      const hoursNum = parseInt(h || '0', 10);
      const minutesNum = parseInt(m || '0', 10);
      if (isNaN(hoursNum) || isNaN(minutesNum) || hoursNum < 0 || minutesNum < 0 || minutesNum >= 60) {
        return '00:00';
      }
      return `${hoursNum.toString().padStart(2, '0')}:${minutesNum.toString().padStart(2, '0')}`;
    }
    
    // If decimal format, convert to HH:MM
    const decimalHours = parseFloat(trimmed);
    if (isNaN(decimalHours) || decimalHours < 0) {
      return '00:00';
    }
    return formatHoursToHHMM(decimalHours);
  }
  
  return '00:00';
}

/**
 * Parses hours from HH:MM format or decimal format to decimal number
 * @param hours - Hours string in HH:MM format (e.g., "40:30") or decimal string (e.g., "40.5")
 * @returns Decimal hours number
 */
export function parseHours(hours: string | number | null | undefined): number {
  if (!hours) return 0;
  
  if (typeof hours === 'number') {
    return hours;
  }
  
  if (typeof hours === 'string') {
    if (hours.includes(':')) {
      // HH:MM format
      const [hoursStr, minutesStr] = hours.split(':');
      const h = parseInt(hoursStr || '0', 10);
      const m = parseInt(minutesStr || '0', 10);
      return h + m / 60;
    } else {
      // Decimal format
      return parseFloat(hours) || 0;
    }
  }
  
  return 0;
}

