import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { createRichTextImageHandlers } from '@/shared/utils/richTextImageHandlers';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { RemovableImageExtension } from '@/shared/ui/RemovableImageExtension';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { changeRequestService } from '@/features/changeRequests/services/changeRequestService';
import { sanitizeChangeRequestHtml } from '@/features/changeRequests/utils/sanitizeChangeRequestHtml';
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
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageHandlers = useMemo(
    () =>
      createRichTextImageHandlers(
        editorRef,
        (file) => uploadImageToSupabase(file, projectId),
        'cr-form-image'
      ),
    [projectId]
  );

  const insertImagesIntoDescription = useCallback(
    async (fileList: FileList | File[]) => {
      const ed = editorRef.current;
      if (!ed) {
        toast.error('Editor not ready — try again in a moment');
        return;
      }

      const images = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) {
        toast.error('Please drop image files only (PNG, JPG, GIF, etc.)');
        return;
      }

      for (const file of images) {
        try {
          toast.loading(`Uploading ${file.name}...`, { id: 'cr-form-image' });
          const url = await uploadImageToSupabase(file, projectId);
          if (url) {
            ed.chain().focus().setImage({ src: url }).run();
            toast.success('Image added to description', { id: 'cr-form-image' });
          } else {
            toast.error(`Failed to upload ${file.name}`, { id: 'cr-form-image' });
          }
        } catch {
          toast.error(`Failed to upload ${file.name}`, { id: 'cr-form-image' });
        }
      }
    },
    [projectId]
  );

  const processDroppedFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const all = Array.from(fileList);
      const images = all.filter((f) => f.type.startsWith('image/'));
      const pdfs = all.filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      const other = all.filter((f) => !images.includes(f) && !pdfs.includes(f));

      if (other.length > 0) {
        toast.error('Only images and PDF files are supported');
      }

      if (images.length > 0) {
        await insertImagesIntoDescription(images);
      }

      if (pdfs.length > 0) {
        const maxSize = 5 * 1024 * 1024;
        const valid = pdfs.filter((f) => {
          if (f.size > maxSize) {
            toast.error(`${f.name} exceeds 5MB limit`);
            return false;
          }
          return true;
        });
        if (valid.length > 0) {
          setFiles((prev) => [...prev, ...valid]);
          toast.success(
            valid.length === 1 ? 'PDF attached' : `${valid.length} PDFs attached`
          );
        }
      }
    },
    [insertImagesIntoDescription]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      RemovableImageExtension.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md block',
        },
      }),
      Link.configure({ openOnClick: true }),
      Placeholder.configure({ placeholder: 'Write the change request — support formatting, links, and inline styles.' }),
    ],
    content: description || '',
    onUpdate: ({ editor }) => {
      setDescription(editor.getHTML());
    },
    editorProps: {
      handlePaste: imageHandlers.handlePaste,
      handleDrop: imageHandlers.handleDrop,
      handleDragOver: imageHandlers.handleDragOver,
    },
  });

  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

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

      html = sanitizeChangeRequestHtml(html);

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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            tabIndex={-1}
            aria-hidden
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.length) void processDroppedFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div
            className={cn(
              'relative border rounded bg-white min-h-[200px] w-full max-w-[900px] p-2 transition-colors',
              isDragging && 'border-2 border-dashed border-primary bg-primary/5'
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              if (e.dataTransfer.files?.length) void processDroppedFiles(e.dataTransfer.files);
            }}
          >
            {editor ? (
              <EditorContent editor={editor} className="min-h-[160px] [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none" />
            ) : (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[160px] px-1 py-1 border-0 rounded outline-none resize-y"
                rows={6}
              />
            )}

            {isDragging && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
                <p className="mt-2 text-sm font-medium text-primary">Drop to upload</p>
              </div>
            )}

          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {editor ? <span>{(editor.getText() || '').length} chars</span> : null}
            <span aria-hidden>·</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Attach images or PDFs
            </button>
            <span>· drag & drop or paste into the box above</span>
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
      
      {files.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Attached PDFs</label>
          <ul className="space-y-1 text-xs text-muted-foreground rounded border p-2 bg-muted/10">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-destructive hover:underline"
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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

