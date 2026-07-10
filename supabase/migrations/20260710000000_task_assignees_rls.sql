-- Extend task RLS to support task_assignees junction table and user create/edit flows

DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;

CREATE POLICY "Users can view their assigned tasks"
ON public.tasks
FOR SELECT
USING (
  assigned_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_assignees.task_id = tasks.id
    AND task_assignees.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can update their assigned tasks"
ON public.tasks
FOR UPDATE
USING (
  assigned_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_assignees.task_id = tasks.id
    AND task_assignees.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Authenticated users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can manage task assignees" ON public.task_assignees;

CREATE POLICY "Users can view task assignees"
ON public.task_assignees
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = task_assignees.task_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can manage task assignees"
ON public.task_assignees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = task_assignees.task_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
  OR NOT EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = task_assignees.task_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = task_assignees.task_id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
  OR NOT EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = task_assignees.task_id
  )
);
