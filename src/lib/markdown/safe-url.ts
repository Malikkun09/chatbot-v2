const SAFE_HREF = /^(https?:|mailto:|\/|#)/i;

export function safeHref(href: string | undefined | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("data:") || lowered.startsWith("vbscript:")) {
    return null;
  }
  if (!SAFE_HREF.test(trimmed)) return null;
  return trimmed;
}

export function safeImageSrc(src: string | undefined | null): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:")) return null;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  return null;
}
