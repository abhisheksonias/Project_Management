-- Make change_requests.status a text column and remove restrictive check constraint
BEGIN;

-- Change type to text so it can store task status values like 'In Progress'
ALTER TABLE public.change_requests
  ALTER COLUMN status TYPE text USING status::text;

-- Ensure status_history.status can store arbitrary status strings too
ALTER TABLE public.status_history
  ALTER COLUMN status TYPE text USING status::text;

-- Remove restrictive enum-like check constraint so statuses can mirror task.status
ALTER TABLE public.change_requests
  DROP CONSTRAINT IF EXISTS change_requests_status_check;

COMMIT;

