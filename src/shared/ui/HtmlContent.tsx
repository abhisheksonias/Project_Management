import React from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface HtmlContentProps {
  content: string;
  className?: string;
  as?: 'div' | 'p' | 'span';
}

/**
 * Safely renders HTML content from rich text editor
 * Note: This uses dangerouslySetInnerHTML, so content should be sanitized on the backend
 */
export const HtmlContent: React.FC<HtmlContentProps> = ({
  content,
  className,
  as: Component = 'div',
}) => {
  if (!content) {
    return null;
  }

  return (
    <Component
      className={cn(
        'prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2',
        className
      )}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(content, {
          FORBID_TAGS: ['input', 'button', 'form', 'iframe', 'script', 'style'],
        }),
      }}
    />
  );
};

