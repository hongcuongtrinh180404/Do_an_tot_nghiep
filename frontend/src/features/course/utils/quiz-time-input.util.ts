import { isQuizTimestamp } from 'share-lib';

export function formatQuizTime(value: number | null): string {
  if (value === null) return '';
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}

export function parseQuizTime(text: string, duration?: number): { value: number | null; error?: string } {
  if (!text.trim()) return { value: null };
  const match = /^(\d{2,}):([0-5]\d)$/.exec(text.trim());
  if (!match) return { value: null, error: 'Nhập thời gian theo MM:SS, giây từ 00 đến 59.' };
  const value = Number(match[1]) * 60 + Number(match[2]);
  if (!isQuizTimestamp(value, duration)) {
    return { value: null, error: 'Thời điểm xuất hiện không được vượt quá thời lượng video.' };
  }
  return { value };
}
