import DOMPurify from 'dompurify';

const PURIFY_OPTIONS: Parameters<typeof DOMPurify.sanitize>[1] = {
  FORBID_TAGS: ['input', 'button', 'form', 'iframe', 'script', 'style', 'object', 'embed'],
  FORBID_ATTR: ['onclick', 'onerror', 'onload'],
};

/**
 * Removes editor/file-upload artifacts and broken nodes from change request description HTML.
 */
export function sanitizeChangeRequestHtml(html: string): string {
  const trimmed = html?.trim() ?? '';
  if (!trimmed) return '';

  const clean = DOMPurify.sanitize(trimmed, PURIFY_OPTIONS);
  const doc = new DOMParser().parseFromString(clean, 'text/html');

  doc.querySelectorAll('input, button, label[for]').forEach((el) => el.remove());

  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src')?.trim() ?? '';
    if (!src || src === '#' || src === 'about:blank') {
      img.remove();
    }
  });

  // Drop empty wrappers left after removing controls
  doc.body.querySelectorAll('div, span, p').forEach((el) => {
    if (!el.textContent?.trim() && !el.querySelector('img, a, ul, ol')) {
      el.remove();
    }
  });

  const result = doc.body.innerHTML.trim();
  if (!result || result === '<p></p>') return '';
  return result;
}
