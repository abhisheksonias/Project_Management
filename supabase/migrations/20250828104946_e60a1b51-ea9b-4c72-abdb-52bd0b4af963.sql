-- Enable Row Level Security on all remaining tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for projects (admins can see all, users see assigned projects)
CREATE POLICY "Users can view projects they are assigned to" 
ON public.projects 
FOR SELECT 
USING (
  admin_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.project_id = projects.id 
    AND tasks.assigned_user_id = auth.uid()
  )
);

-- Basic RLS policies for tasks (users can see their assigned tasks, admins can see all)
CREATE POLICY "Users can view their assigned tasks" 
ON public.tasks 
FOR SELECT 
USING (
  assigned_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id 
    AND projects.admin_id = auth.uid()
  )
);

-- Basic RLS policies for work_logs (users can see their own logs)
CREATE POLICY "Users can view their own work logs" 
ON public.work_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own work logs" 
ON public.work_logs 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Basic RLS policies for status_history (users can view history for their accessible entities)
CREATE POLICY "Users can view status history" 
ON public.status_history 
FOR SELECT 
USING (
  updated_by = auth.uid() OR
  (entity_type = 'project' AND EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = status_history.entity_id 
    AND (projects.admin_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.project_id = projects.id 
      AND tasks.assigned_user_id = auth.uid()
    ))
  )) OR
  (entity_type = 'task' AND EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = status_history.entity_id 
    AND (tasks.assigned_user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = tasks.project_id 
      AND projects.admin_id = auth.uid()
    ))
  ))
);