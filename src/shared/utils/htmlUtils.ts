/**
 * Strips HTML tags from a string and returns plain text
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary DOM element to parse HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

/**
 * Gets plain text preview of HTML content (first N characters)
 */
export const getHtmlPreview = (html: string, maxLength: number = 100): string => {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

