import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChangeRequestForm } from '@/features/changeRequests/ui/ChangeRequestForm';
import { ChangeRequestsList } from '@/features/changeRequests/ui/ChangeRequestsList';
import { toast } from 'sonner';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PublicChangeRequests: React.FC = () => {
  const query = useQuery();
  const projectId = query.get('project_id') || undefined;
  const token = query.get('token') || undefined;
  const [valid, setValid] = useState(false);
  const [checking, setChecking] = useState(true);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const validate = async () => {
      if (!projectId || !token) {
        setValid(false);
        setChecking(false);
        return;
      }

      try {
        setChecking(true);
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, client_access_token')
          .eq('id', projectId)
          .single();

        if (error || !data) {
          setValid(false);
          toast.error('Invalid link');
          return;
        }

        if (data.client_access_token !== token) {
          setValid(false);
          toast.error('Invalid access token');
          return;
        }

        setProjectName(data.name || null);
        setValid(true);
      } catch (err) {
        setValid(false);
      } finally {
        setChecking(false);
      }
    };

    validate();
  }, [projectId, token]);

  if (checking) return <div className="p-6">Validating link...</div>;
  if (!valid) return <div className="p-6">Invalid or expired link.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Change Requests for {projectName}</h1>

      <div className="mb-6 text-sm text-muted-foreground">
        Use this link to submit change requests to the project. Paste or drag & drop images into the description, attach files (images/PDFs), and add reference links.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow-sm md:col-span-2">
          <h2 className="text-lg font-medium mb-2">Submit a Request</h2>
          <ChangeRequestForm projectId={projectId!} onSubmitted={() => setRefreshKey((k) => k + 1)} />
        </div>

        <div className="bg-white p-4 rounded shadow-sm">
          <h2 className="text-lg font-medium mb-2">Existing Requests</h2>
          <ChangeRequestsList projectId={projectId!} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
};

export default PublicChangeRequests;

