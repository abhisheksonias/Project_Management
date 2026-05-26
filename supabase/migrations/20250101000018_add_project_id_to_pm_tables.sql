-- Add project_id column to pm_tables to link tables with projects
ALTER TABLE public.pm_tables
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pm_tables_project_id ON public.pm_tables(project_id);

-- Add comment to describe the column
COMMENT ON COLUMN public.pm_tables.project_id IS 'The project this shared table is linked to (optional)';
