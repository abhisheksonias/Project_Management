-- Enable project management for admins
CREATE POLICY "Admins can insert projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'Admin'
  )
);

CREATE POLICY "Admins can update projects" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'Admin'
  )
);

CREATE POLICY "Admins can delete projects" 
ON public.projects 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'Admin'
  )
);

-- Allow admins to view all users for project assignment
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Admin'
  )
);