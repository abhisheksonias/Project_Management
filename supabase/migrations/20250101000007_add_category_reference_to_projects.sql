-- Add category and reference columns to projects table
ALTER TABLE public.projects 
ADD COLUMN category VARCHAR(50),
ADD COLUMN reference VARCHAR(255);

-- Add comments to describe the columns
COMMENT ON COLUMN public.projects.category IS 'Project category: One-time, Maintenance, Hourly';
COMMENT ON COLUMN public.projects.reference IS 'Reference person/company who helped get the client: Direct, B2B (Client Name)';

-- Create index for better performance on filtering
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_reference ON public.projects(reference);
