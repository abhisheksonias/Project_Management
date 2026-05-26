-- Add added_by column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS added_by text;

-- Add comment to the column
COMMENT ON COLUMN public.tasks.added_by IS 'Name of the user who created the task';
