import React from 'react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const RemovableImageView: React.FC<NodeViewProps> = ({ node, deleteNode, editor, selected }) => {
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) || '';

  return (
    <NodeViewWrapper className="my-2 block max-w-full">
      <div
        className={cn(
          'relative inline-block max-w-full rounded-md',
          selected && 'ring-2 ring-primary ring-offset-2'
        )}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded-md block"
          draggable={false}
        />
        {editor.isEditable && (
          <button
            type="button"
            contentEditable={false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-md transition-colors hover:bg-destructive/90"
            title="Remove image"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

/** Image node with an X button to remove while editing. */
export const RemovableImageExtension = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(RemovableImageView);
  },
});
