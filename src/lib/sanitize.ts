import DOMPurify from "isomorphic-dompurify";

export function sanitizeUserText(input: string): string {
  const trimmed = input.replace(/\0/g, "").trim();
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}
