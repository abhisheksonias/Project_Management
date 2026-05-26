-- Ensure admin users can read/manage all work logs while users keep access to their own rows.
-- This migration intentionally resets work_logs policies to avoid conflicts from older migrations.

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'work_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.work_logs', policy_record.policyname);
  END LOOP;
END
$$;

CREATE POLICY "work_logs_select_policy"
ON public.work_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role, '')) = 'admin'
  )
);

CREATE POLICY "work_logs_insert_policy"
ON public.work_logs
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role, '')) = 'admin'
  )
);

CREATE POLICY "work_logs_update_policy"
ON public.work_logs
FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role, '')) = 'admin'
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role, '')) = 'admin'
  )
);

CREATE POLICY "work_logs_delete_policy"
ON public.work_logs
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.role, '')) = 'admin'
  )
);
