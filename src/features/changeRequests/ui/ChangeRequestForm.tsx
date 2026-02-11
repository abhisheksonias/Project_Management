import React, { useState } from 'react';
import { changeRequestService } from '@/features/changeRequests/services/changeRequestService';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  onSubmitted?: () => void;
}

export const ChangeRequestForm: React.FC<Props> = ({ projectId, onSubmitted }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'design' | 'development'>('design');
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    setFiles(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    try {
      setSubmitting(true);
      const refLinks = links
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      await changeRequestService.createChangeRequest(projectId, {
        title: title.trim(),
        description: description.trim(),
        category,
        files,
        reference_links: refLinks.length ? refLinks : undefined,
        created_by: null,
      });

      toast.success('Change request submitted');
      setTitle('');
      setDescription('');
      setFiles([]);
      setLinks('');
      onSubmitted?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" rows={5} />
      </div>
      <div>
        <label className="block text-sm font-medium">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3 py-2 border rounded">
          <option value="design">Design</option>
          <option value="development">Development</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Attachments (≤5MB each)</label>
        <input type="file" multiple onChange={handleFiles} />
      </div>
      <div>
        <label className="block text-sm font-medium">Reference links (one per line)</label>
        <textarea value={links} onChange={(e) => setLinks(e.target.value)} className="w-full px-3 py-2 border rounded" rows={3} />
      </div>
      <div>
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded">
          {submitting ? 'Submitting...' : 'Submit Change Request'}
        </button>
      </div>
    </form>
  );
};

