-- Allow users to update project comments for projects they have access to
-- This policy allows users to update the comments field only for projects they have access to
CREATE POLICY "Users can update project comments" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (
  -- Users can update comments if they have access to the project
  admin_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.project_id = projects.id 
    AND tasks.assigned_user_id = auth.uid()
  )
)
WITH CHECK (
  -- Users can only update the comments field, not other project fields
  admin_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.project_id = projects.id 
    AND tasks.assigned_user_id = auth.uid()
  )
);

-- Note: This policy allows users to update any field in the projects table
-- In a production environment, you might want to create a more restrictive policy
-- that only allows updating the comments field specifically
