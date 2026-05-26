-- Update change_requests.status check constraint to support additional statuses
BEGIN;

ALTER TABLE public.change_requests
  DROP CONSTRAINT IF EXISTS change_requests_status_check;

ALTER TABLE public.change_requests
  ADD CONSTRAINT change_requests_status_check CHECK (
    status IN ('open','accepted','in progress','review','completed','in_review','approved','rejected','converted')
  );

COMMIT;

