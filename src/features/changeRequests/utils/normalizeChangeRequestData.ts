/**
 * Normalizes jsonb/string/list fields from Supabase change_requests rows.
 */
export function normalizeStringList(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // treat as newline-separated URLs
    }

    return trimmed
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

export function referenceLinkLabel(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    let label = `${parsed.hostname}${parsed.pathname.length > 1 ? parsed.pathname : ''}`;
    if (label.length > 60) label = `${label.slice(0, 57)}...`;
    return label;
  } catch {
    if (url.length > 60) return `${url.slice(0, 57)}...`;
    return url;
  }
}
