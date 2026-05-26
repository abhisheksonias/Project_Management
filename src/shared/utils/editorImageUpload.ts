import { supabase } from '@/integrations/supabase/client';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function uploadToBucket(
  bucket: string,
  filePath: string,
  file: File | Blob
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file as File, { cacheControl: '3600', upsert: false });

  if (error) return null;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

/**
 * Upload an image for a task comment. Tries attachments then change-request-media buckets.
 */
export async function uploadTaskCommentImage(
  file: File | Blob,
  taskId: string,
  projectId?: string | null
): Promise<string | null> {
  try {
    const size = (file as File).size;
    if (size && size > MAX_IMAGE_SIZE) {
      throw new Error('Image must be 5MB or smaller');
    }

    const ext = ((file as File).type?.split('/')?.[1] || 'png').replace(/jpeg/, 'jpg');
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 1e9)}.${ext}`;
    const folder = projectId
      ? `projects/${projectId}/tasks/${taskId}`
      : `tasks/${taskId}`;
    const filePath = `${folder}/${fileName}`;

    const url =
      (await uploadToBucket('attachments', filePath, file)) ??
      (await uploadToBucket('change-request-media', filePath, file));

    return url;
  } catch (err) {
    console.error('uploadTaskCommentImage error', err);
    return null;
  }
}
