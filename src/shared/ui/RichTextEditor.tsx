import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Undo, Redo, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showToolbar?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor>['editor']) => void;
}

const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const formatUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter description...',
  className,
  disabled = false,
  showToolbar = true,
  onEditorReady,
}) => {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2 text-sm',
      },
    },
  });

  // Update editor content when value prop changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  // Expose editor instance to parent
  React.useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const setBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const setItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const setBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const setOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const undo = useCallback(() => {
    editor?.chain().focus().undo().run();
  }, [editor]);

  const redo = useCallback(() => {
    editor?.chain().focus().redo().run();
  }, [editor]);

  const setLink = useCallback(() => {
    const { from, to } = editor?.state.selection || {};
    const selectedText = editor?.state.doc.textBetween(from || 0, to || 0, ' ');
    
    if (selectedText) {
      setLinkText(selectedText);
    } else {
      setLinkText('');
    }
    
    // Check if current selection is already a link
    const attrs = editor?.getAttributes('link');
    if (attrs?.href) {
      setLinkUrl(attrs.href);
    } else {
      setLinkUrl('');
    }
    
    setIsLinkDialogOpen(true);
  }, [editor]);

  const handleInsertLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;

    const formattedUrl = formatUrl(linkUrl.trim());
    
    if (!isValidUrl(formattedUrl)) {
      alert('Please enter a valid URL');
      return;
    }

    if (linkText.trim()) {
      // Insert link with custom text
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${formattedUrl}">${linkText.trim()}</a>`)
        .run();
    } else {
      // Insert link with URL as text
      editor
        .chain()
        .focus()
        .setLink({ href: formattedUrl })
        .run();
    }

    setIsLinkDialogOpen(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl, linkText]);

  const handleRemoveLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
    setIsLinkDialogOpen(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor]);

  // Keyboard shortcut for link (Ctrl+K or Cmd+K)
  React.useEffect(() => {
    if (!editor || disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const { from, to } = editor.state.selection || {};
        const selectedText = editor.state.doc.textBetween(from || 0, to || 0, ' ');
        
        if (selectedText) {
          setLinkText(selectedText);
        } else {
          setLinkText('');
        }
        
        // Check if current selection is already a link
        const attrs = editor.getAttributes('link');
        if (attrs?.href) {
          setLinkUrl(attrs.href);
        } else {
          setLinkUrl('');
        }
        
        setIsLinkDialogOpen(true);
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [editor, disabled]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-[14px] bg-background', className)}>
      {/* Toolbar */}
      {showToolbar && (
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30 rounded-t-[14px]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setBold}
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0 rounded-[8px]',
            editor.isActive('bold') && 'bg-muted'
          )}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setItalic}
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0 rounded-[8px]',
            editor.isActive('italic') && 'bg-muted'
          )}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setBulletList}
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0 rounded-[8px]',
            editor.isActive('bulletList') && 'bg-muted'
          )}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setOrderedList}
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0 rounded-[8px]',
            editor.isActive('orderedList') && 'bg-muted'
          )}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={disabled || !editor.can().undo()}
          className="h-7 w-7 p-0 rounded-[8px]"
          title="Undo"
        >
          <Undo className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={disabled || !editor.can().redo()}
          className="h-7 w-7 p-0 rounded-[8px]"
          title="Redo"
        >
          <Redo className="h-3.5 w-3.5" />
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setLink}
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0 rounded-[8px]',
            editor.isActive('link') && 'bg-muted'
          )}
          title="Insert Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
      )}

      {/* Editor Content */}
      <div className={cn(showToolbar ? 'rounded-b-[14px]' : 'rounded-[14px]')}>
        <EditorContent editor={editor} />
      </div>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="rounded-[14px]">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a link to your text. You can paste a URL or enter it manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="rounded-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-text">Link Text (optional)</Label>
              <Input
                id="link-text"
                placeholder="Click here"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="rounded-[14px]"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the URL as the link text
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {editor?.isActive('link') && (
              <Button
                variant="destructive"
                onClick={handleRemoveLink}
                className="rounded-[14px] w-full sm:w-auto"
              >
                Remove Link
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsLinkDialogOpen(false)}
              className="rounded-[14px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInsertLink}
              disabled={!linkUrl.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px] w-full sm:w-auto"
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
