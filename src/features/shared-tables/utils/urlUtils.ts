/**
 * Get shorter display text from URL
 */
export const getShortUrlText = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Return domain + path (limited to 30 chars)
    const path = urlObj.pathname.length > 0 ? urlObj.pathname : '';
    const fullPath = urlObj.hostname + path;
    if (fullPath.length > 30) {
      return fullPath.substring(0, 27) + '...';
    }
    return fullPath;
  } catch {
    // If URL parsing fails, just truncate the original string
    if (url.length > 30) {
      return url.substring(0, 27) + '...';
    }
    return url;
  }
};

