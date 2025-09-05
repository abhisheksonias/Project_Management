-- Update work_logs table to use hours column instead of start_time and end_time

-- Add the new hours column
ALTER TABLE public.work_logs ADD COLUMN hours TEXT;

-- Update existing records to calculate hours from start_time and end_time
UPDATE public.work_logs 
SET hours = CONCAT(
  LPAD(EXTRACT(EPOCH FROM (end_time::timestamp - start_time::timestamp))::INTEGER / 3600, 2, '0'),
  ':',
  LPAD(((EXTRACT(EPOCH FROM (end_time::timestamp - start_time::timestamp))::INTEGER % 3600) / 60), 2, '0')
)
WHERE start_time IS NOT NULL AND end_time IS NOT NULL;

-- Make hours column NOT NULL
ALTER TABLE public.work_logs ALTER COLUMN hours SET NOT NULL;

-- Drop the old columns
ALTER TABLE public.work_logs DROP COLUMN start_time;
ALTER TABLE public.work_logs DROP COLUMN end_time;
