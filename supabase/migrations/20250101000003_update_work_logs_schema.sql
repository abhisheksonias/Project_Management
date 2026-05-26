-- Update work_logs table schema to match new requirements

-- Add the new columns
ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS added_by TEXT;
ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Set default values for created_at and updated_at
ALTER TABLE public.work_logs ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.work_logs ALTER COLUMN updated_at SET DEFAULT NOW();

-- Update existing records to have created_at and updated_at
UPDATE public.work_logs 
SET created_at = NOW(), updated_at = NOW() 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Make created_at and updated_at NOT NULL
ALTER TABLE public.work_logs ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.work_logs ALTER COLUMN updated_at SET NOT NULL;

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_work_logs_updated_at ON public.work_logs;
CREATE TRIGGER update_work_logs_updated_at
    BEFORE UPDATE ON public.work_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
