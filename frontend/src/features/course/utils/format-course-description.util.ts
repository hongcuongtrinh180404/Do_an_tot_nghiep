/**
 * Safely extracts clean plain text from an HTML string (e.g. from rich-text editor or HTML seeds).
 * Works reliably across both SSR and browser environments without DOM APIs.
 */
export function extractPlainTextFromHtml(html?: string | null): string {
  if (!html) return '';

  return html
    // Insert a space before/after closing block-level tags and line breaks to prevent merged words
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|tr|table|section|article)>/gi, ' ')
    .replace(/<(?:br|hr)\s*\/?>/gi, ' ')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    // Normalize consecutive whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats course description for compact card preview:
 * 1. Strips HTML markup cleanly into plain text.
 * 2. If the text begins with the course title (e.g. from `<h2>{title}</h2>` heading),
 *    omits the redundant title prefix so the actual description is immediately visible.
 * 3. Falls back to default placeholder if empty.
 */
export function formatCourseDescription(
  description?: string | null,
  courseTitle?: string | null,
  fallbackText: string = 'Chưa có tóm tắt nội dung bài giảng cho khóa học này.',
): string {
  const plainText = extractPlainTextFromHtml(description);
  if (!plainText) {
    return fallbackText;
  }

  if (courseTitle?.trim()) {
    const trimmedTitle = courseTitle.trim();
    if (plainText.toLowerCase().startsWith(trimmedTitle.toLowerCase())) {
      const rest = plainText.slice(trimmedTitle.length).replace(/^[\s.:–—\-]+/, '').trim();
      if (rest) {
        return rest;
      }
    }
  }

  return plainText;
}
