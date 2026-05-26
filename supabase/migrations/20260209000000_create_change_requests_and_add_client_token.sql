-- Create change_requests table and add client_access_token to projects
BEGIN;

-- Add client_access_token to projects if not present
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_access_token text UNIQUE;

-- Create change_requests table
CREATE TABLE IF NOT EXISTS public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in ('design','development')),
  attachment_urls jsonb,
  reference_links jsonb,
  status text not null default 'open' check (status in ('open','in_review','approved','rejected','converted')),
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for queries by project
CREATE INDEX IF NOT EXISTS idx_change_requests_project_id ON public.change_requests(project_id);

COMMIT;

