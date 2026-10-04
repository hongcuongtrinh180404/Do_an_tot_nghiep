/**
 * Converts a Vietnamese string to a clean kebab-case slug.
 * Example: "Khóa học Next.js 16" -> "khoa-hoc-nextjs-16"
 */
export function slugify(str: string): string {
  if (!str) return '';

  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/[\s-]+/g, '-') // Replace multiple spaces or hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Trim hyphens from beginning and end
}
