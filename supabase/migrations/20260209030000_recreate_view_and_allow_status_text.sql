-- Drop dependent view, alter status columns to text, recreate view
BEGIN;

-- Drop view that depends on change_requests.status so we can alter the column type
DROP VIEW IF EXISTS public.change_requests_with_task_status;

-- Change change_requests.status to text
ALTER TABLE public.change_requests
  ALTER COLUMN status TYPE text USING status::text;

-- Change status_history.status to text as well
ALTER TABLE public.status_history
  ALTER COLUMN status TYPE text USING status::text;

-- Remove restrictive check constraint if present
ALTER TABLE public.change_requests
  DROP CONSTRAINT IF EXISTS change_requests_status_check;

-- Recreate the view (explicit columns)
CREATE OR REPLACE VIEW public.change_requests_with_task_status AS
SELECT
  cr.id,
  cr.project_id,
  cr.title,
  cr.description,
  cr.category,
  cr.attachment_urls,
  cr.reference_links,
  cr.status AS request_status,
  cr.created_by,
  cr.created_at,
  cr.updated_at,
  cr.converted_task_id,
  t.status AS task_status,
  CASE
    WHEN t.status IS NULL THEN cr.status
    WHEN lower(t.status) IN ('to do','todo') THEN 'accepted'
    WHEN lower(t.status) = 'in progress' THEN 'in progress'
    WHEN lower(t.status) = 'review' THEN 'review'
    WHEN lower(t.status) = 'blocked' THEN 'in progress'
    WHEN lower(t.status) = 'completed' THEN 'completed'
    ELSE cr.status
  END AS effective_status
FROM public.change_requests cr
LEFT JOIN public.tasks t ON cr.converted_task_id = t.id;

COMMIT;

