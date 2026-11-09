/** SePay's bank timestamp is YYYY-MM-DD HH:mm:ss in Asia/Ho_Chi_Minh, not server local time. */
export function parseSepayTransactionDate(value: string | undefined): Date | null {
  if (!value) return null;
  const bankDate = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(value);
  if (!bankDate && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return null;
  }
  const date = new Date(bankDate ? `${bankDate[1]}T${bankDate[2]}+07:00` : value);
  if (!Number.isFinite(date.getTime())) return null;
  // JS otherwise silently normalizes impossible dates (e.g. February 30).
  const zone = /([+-])(\d{2}):(\d{2})$/.exec(value);
  const offsetMinutes = bankDate ? 420 : zone ? (zone[1] === '+' ? 1 : -1) * (Number(zone[2]) * 60 + Number(zone[3])) : 0;
  if (new Date(date.getTime() + offsetMinutes * 60000).toISOString().slice(0, 19) !== value.replace(' ', 'T').slice(0, 19)) {
    return null;
  }
  return date;
}
