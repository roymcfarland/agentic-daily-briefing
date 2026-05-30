export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function sanitizeUrl(value: string): string {
  try {
    const { protocol } = new URL(value);
    if (protocol === "http:" || protocol === "https:") {
      return value;
    }
  } catch {
    // Invalid or relative URLs fall through to the safe default.
  }
  return "#";
}
