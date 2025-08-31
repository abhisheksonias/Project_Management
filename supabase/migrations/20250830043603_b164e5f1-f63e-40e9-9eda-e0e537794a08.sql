-- Update tasks table RLS policies to allow proper CRUD operations for admins and users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;

-- Create comprehensive RLS policies for tasks
CREATE POLICY "Admins can manage all tasks" 
ON public.tasks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can view their assigned tasks" 
ON public.tasks 
FOR SELECT 
USING (
  assigned_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can update their assigned tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  assigned_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'
  )
);

-- Ensure comment column exists and update its type if needed
ALTER TABLE public.tasks ALTER COLUMN comment TYPE jsonb USING comment::jsonb;