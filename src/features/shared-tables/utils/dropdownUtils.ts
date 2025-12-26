/**
 * Normalize dropdown options to object structure { label, color }
 */
export const normalizeDropdownOptions = (options: any[]): Array<{ label: string; color: string }> => {
  return options.map((opt: any) => {
    if (typeof opt === 'string') {
      return { label: opt, color: 'bg-secondary' };
    }
    return opt;
  });
};

/**
 * Color options for dropdown
 */
export const DROPDOWN_COLOR_OPTIONS = [
  { value: 'bg-secondary', label: 'Gray' },
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-yellow-500', label: 'Yellow' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-indigo-500', label: 'Indigo' },
] as const;

/**
 * Determine text color based on background color class
 */
export const getTextColor = (colorClass?: string): string => {
  if (!colorClass) return '';
  // Simple heuristic: if color is dark (red-500, blue-500 etc), use white text. 
  // If it's light (secondary, slate-100), use dark text.
  // Most tailwind colors > 400 are dark enough for white text.
  return colorClass.includes('-500') || colorClass.includes('-600') || colorClass.includes('-700')
    ? 'text-white'
    : 'text-foreground';
};

