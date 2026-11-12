export function formatVnd(amount?: number | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '0đ';
  }
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}đ`;
}

export function formatDateVn(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return '--';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '--';
  }
}

export function formatTimeVn(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return '--';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '--';
  }
}

export function formatDateTimeVn(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return '--';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} – ${hours}:${minutes}`;
  } catch {
    return '--';
  }
}

