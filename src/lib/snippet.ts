export function contextualSnippet(text: string, needle: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!needle.trim()) {
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
  const lower = t.toLowerCase();
  const q = needle.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) {
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
  const pad = 50;
  const start = Math.max(0, idx - pad);
  const end = Math.min(t.length, idx + needle.length + pad);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < t.length ? "…" : "";
  return `${prefix}${t.slice(start, end)}${suffix}`;
}
