/**
 * Safely decodes a file name or text string that may have been mangled by multipart/form-data
 * parsers (e.g. Multer / Busboy) decoding UTF-8 bytes as Latin-1 (ISO-8859-1).
 *
 * Example:
 *   Input:  'CÃ¡c chá»§ Ä\x91á»\x81 tiá»\x87u luáº­n.docx'
 *   Output: 'Các chủ đề tiểu luận.docx'
 */
export function decodeUtf8FileName(fileName?: string | null): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  const trimmed = fileName.trim();
  if (!trimmed) {
    return '';
  }

  // Fast path: if the string already contains code points > 255 (e.g. 'đ', 'ư', 'ơ', etc.),
  // it cannot be a pure Latin-1 byte stream (where each character code is strictly 0-255).
  const isAllLatin1 = [...trimmed].every((char) => char.charCodeAt(0) <= 255);
  if (!isAllLatin1) {
    return trimmed;
  }

  try {
    const bytes = Uint8Array.from(trimmed, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Only return decoded if it actually produced a valid, different string that condensed multibyte characters
    if (decoded && decoded !== trimmed && decoded.length < trimmed.length) {
      return decoded;
    }
  } catch {
    // If not a valid UTF-8 byte sequence, safely return original string
  }

  return trimmed;
}
