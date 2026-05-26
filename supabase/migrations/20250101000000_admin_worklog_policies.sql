-- Add policies to allow admins to manage work logs for all users

-- Drop existing work log policies
DROP POLICY IF EXISTS "Users can view their own work logs" ON public.work_logs;
DROP POLICY IF EXISTS "Users can insert their own work logs" ON public.work_logs;

-- Create comprehensive RLS policies for work_logs
CREATE POLICY "Admins can manage all work logs" 
ON public.work_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can view their own work logs" 
ON public.work_logs 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can insert their own work logs" 
ON public.work_logs 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can update their own work logs" 
ON public.work_logs 
FOR UPDATE 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can delete their own work logs" 
ON public.work_logs 
FOR DELETE 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);
