import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';

type EditorRef = { current: Editor | null };

export function createRichTextImageHandlers(
  editorRef: EditorRef,
  onUploadImage: (file: File) => Promise<string | null>,
  toastId = 'editor-image-upload'
) {
  const insertImage = async (file: File) => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      toast.loading('Uploading image...', { id: toastId });
      const url = await onUploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
        toast.success('Image added', { id: toastId });
      } else {
        toast.error('Failed to upload image', { id: toastId });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Image upload failed';
      toast.error(message, { id: toastId });
    }
  };

  const handleImageFiles = (files: FileList | File[]) => {
    let handled = false;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        handled = true;
        void insertImage(file);
      }
    });
    return handled;
  };

  return {
    handlePaste: (_view: unknown, event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.type?.includes('image')) {
          const file = item.getAsFile();
          if (!file) continue;
          event.preventDefault();
          void insertImage(file);
          return true;
        }
      }
      return false;
    },

    handleDrop: (_view: unknown, event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (!files?.length) return false;

      const handled = handleImageFiles(files);
      if (handled) {
        event.preventDefault();
        return true;
      }
      return false;
    },

    handleDragOver: (_view: unknown, event: DragEvent) => {
      const hasImage = Array.from(event.dataTransfer?.items ?? []).some((item) =>
        item.type.startsWith('image/')
      );
      if (hasImage) {
        event.preventDefault();
        return true;
      }
      return false;
    },
  };
}
