const ESC: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};

/** Escape user-supplied strings before embedding in HTML (print windows, doc.write). */
export function esc(str: string | null | undefined): string {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, c => ESC[c]);
}
