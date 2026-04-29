const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

/**
 * Escapes user-supplied text before it is embedded in HTML.
 * Use whenever a string is interpolated into HTML attributes, body,
 * or passed to dangerouslySetInnerHTML / email templates.
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (ch) => HTML_ENTITY_MAP[ch] ?? ch);
}

/**
 * Escapes a string then re-applies a tiny safe-list of formatting tokens.
 * Currently supports:
 *   - **bold** -> <strong>bold</strong>
 *   - leading "• " or "- " bullet -> "→ "
 *   - newlines -> <br/>
 *
 * Designed for AI-generated message rendering where we want minimal
 * formatting without exposing the surface area of full Markdown.
 */
export function renderSafeMarkdown(input: string): string {
  const escaped = escapeHtml(input);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|<br\/>|\n)([•\-]) /g, "$1→ ")
    .replace(/\n/g, "<br/>");
}
