import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { changeRequestService } from '@/features/changeRequests/services/changeRequestService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Upload helper: uploads a File/Blob to Supabase 'attachments' bucket and returns public URL or null on failure.
export async function uploadImageToSupabase(file: File | Blob, projectId: string): Promise<string | null> {
  try {
    // enforce 10MB limit for pasted images (adjustable)
    const maxSize = 10 * 1024 * 1024;
    if ((file as File).size && (file as File).size > maxSize) {
      console.error('Pasted image exceeds size limit');
      return null;
    }

    const ext = (file as File).type.split('/')?.[1] || 'png';
    const fileName = `pasted_${projectId}_${Date.now()}_${Math.floor(Math.random() * 1e9)}.${ext}`;
    const filePath = `projects/${projectId}/${fileName}`;
    // Try primary bucket 'attachments' first
    try {
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file as File, { cacheControl: '3600', upsert: false });
      if (!uploadError) {
        const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
        if (data && data.publicUrl) return data.publicUrl;
      } else {
        console.warn('attachments upload error, will try fallback', uploadError);
      }
    } catch (err) {
      console.warn('attachments upload threw, will try fallback', err);
    }

    // Fallback to legacy bucket 'change-request-media' if available
    try {
      const legacyPath = filePath;
      const { error: uploadError2 } = await supabase.storage
        .from('change-request-media')
        .upload(legacyPath, file as File, { cacheControl: '3600', upsert: false });
      if (!uploadError2) {
        const { data } = supabase.storage.from('change-request-media').getPublicUrl(legacyPath);
        if (data && data.publicUrl) return data.publicUrl;
      } else {
        console.error('change-request-media upload error', uploadError2);
      }
    } catch (err) {
      console.error('change-request-media upload threw', err);
    }

    return null;
  } catch (err) {
    console.error('uploadImageToSupabase error', err);
    return null;
  }
}
interface Props {
  projectId: string;
  onSubmitted?: () => void;
}

export const ChangeRequestForm: React.FC<Props> = ({ projectId, onSubmitted }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'design' | 'development'>('design');
  const [requestType, setRequestType] = useState<'change_request' | 'feedback'>('change_request');
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    setFiles(selected);
  };
  

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Link.configure({ openOnClick: true }),
      Placeholder.configure({ placeholder: 'Write the change request — support formatting, links, and inline styles.' }),
    ],
    content: description || '',
    onUpdate: ({ editor }) => {
      setDescription(editor.getHTML());
    },
    editorProps: {
      // handle clipboard image paste (synchronous handler — launches async upload tasks)
      handlePaste(view: any, event: ClipboardEvent) {
        try {
          const processFile = async (file: File) => {
            try {
              toast('Uploading image...', { id: 'paste-upload' });
              const url = await uploadImageToSupabase(file, projectId);
              if (url && editor) {
                (editor as any).chain().focus().setImage({ src: url }).run();
                toast.success('Image inserted', { id: 'paste-upload' });
              } else {
                toast.error('Failed to upload pasted image', { id: 'paste-upload' });
                console.error('Failed to upload pasted image');
              }
            } catch (err) {
              toast.error('Image upload failed', { id: 'paste-upload' });
              console.error('Async paste upload error', err);
            }
          };

          const items = event.clipboardData?.items;
          let handled = false;

          if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (!item) continue;
              if (item.type && item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (!file) continue;
                // prevent default paste behavior for images
                event.preventDefault();
                handled = true;
                processFile(file);
              }
            }
            if (handled) return true;
          }

          // Fallback: try async clipboard.read() (some platforms/permissions)
          if (navigator.clipboard && (navigator.clipboard as any).read) {
            (navigator.clipboard as any)
              .read()
              .then((clipboardItems: any[]) => {
                for (const clipboardItem of clipboardItems) {
                  for (const type of clipboardItem.types) {
                    if (type.startsWith('image/')) {
                      clipboardItem.getType(type).then((blob: Blob) => {
                        const file = new File([blob], `pasted.${type.split('/')[1] || 'png'}`, { type });
                        processFile(file);
                      });
                      handled = true;
                    }
                  }
                }
              })
              .catch((err: any) => {
                // ignore; just log for debugging
                console.error('navigator.clipboard.read failed', err);
              });
          }

          return false;
        } catch (err) {
          console.error('handlePaste error', err);
          return false;
        }
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plain = editor?.getText ? editor.getText().trim() : description.replace(/<[^>]+>/g, '').trim();
    if (!title.trim() || !plain) {
      toast.error('Title and description are required');
      return;
    }

    try {
      setSubmitting(true);
      const refLinks = links
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      // Handle pasted images (data URLs) inside editor content:
      let html = editor ? editor.getHTML() : description.trim();
      const dataUrlRegex = /src="(data:image\/[^;]+;base64,[^"]+)"/g;
      const uploadedUrls: string[] = [];
      const uploads: Promise<void>[] = [];
      let match;
      let pasteIndex = 0;
      while ((match = dataUrlRegex.exec(html)) !== null) {
        const dataUrl = match[1];
        // Extract mime and base64
        const mimeMatch = dataUrl.match(/^data:(image\/[^;]+);base64,(.*)$/);
        if (!mimeMatch) continue;
        const mime = mimeMatch[1];
        const b64 = mimeMatch[2];
        const ext = mime.split('/')[1] || 'png';
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: mime });
        const fileName = `pasted_${Date.now()}_${pasteIndex}.${ext}`;
        pasteIndex += 1;

        // upload to supabase
        const filePath = `projects/${projectId}/${Date.now()}_${fileName}`;
        const uploadPromise = (async () => {
          const { error: uploadError } = await supabase.storage
            .from('change-request-media')
            .upload(filePath, blob, { cacheControl: '3600', upsert: false });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('change-request-media').getPublicUrl(filePath);
          if (data && data.publicUrl) {
            uploadedUrls.push(data.publicUrl);
            // replace first occurrence of this dataUrl in html with publicUrl
            html = html.replace(dataUrl, data.publicUrl);
          }
        })();
        uploads.push(uploadPromise);
      }

      if (uploads.length > 0) {
        await Promise.all(uploads);
      }

      await changeRequestService.createChangeRequest(projectId, {
        title: title.trim(),
        description: html,
        category,
        request_type: requestType,
        files, // original selected files (pasted images already uploaded)
        preuploadedUrls: uploadedUrls.length ? uploadedUrls : undefined,
        reference_links: refLinks.length ? refLinks : undefined,
        created_by: null,
      });

      toast.success('Change request submitted');
      setTitle('');
      setDescription('');
      if (editor) editor.commands.setContent('');
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
    <form onSubmit={handleSubmit} className="space-y-3 w-1200px:w-[1200px]">
      <div>
        <label className="block text-sm font-medium">Request Type</label> 
        <select value={requestType} onChange={(e) => setRequestType(e.target.value as any)} className="w-full px-3 py-2 border rounded">
          <option value="change_request">Change Request</option>
          <option value="feedback">Feedback</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded" />
      </div> 
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <div className="relative">
          <div className="bg-white border rounded shadow-sm p-2 mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`px-2 rounded ${editor?.isActive('bold') ? 'bg-gray-100' : ''}`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`px-2 rounded ${editor?.isActive('italic') ? 'bg-gray-100' : ''}`}
            >
              I
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`px-2 rounded ${editor?.isActive('underline') ? 'bg-gray-100' : ''}`}
            >
              U
            </button>
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Enter URL');
                if (url) editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
              }}
              className="px-2 rounded"
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`px-2 rounded ${editor?.isActive('strike') ? 'bg-gray-100' : ''}`}
            >
              S
            </button>
          </div>

          <div className="border rounded p-2 bg-white min-h-[180px] w-full max-w-[900px]">
            {editor ? (
              <EditorContent editor={editor} />
            ) : (
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" rows={5} />
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {editor ? `${(editor.getText() || '').length} chars` : ''}
          </div>
        </div>
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

