export interface ChangeRequestRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: string;
  attachment_urls?: string[] | null;
  reference_links?: string[] | null;
  status: string;
  request_type?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  projects?: { name: string } | null;
  comments?: any[] | null;
}
