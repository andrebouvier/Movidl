/** Calendar date in UTC as `YYYY-MM-DD` (global daily puzzle). */
export function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseOptionalDateParam(raw: string | null): string | null {
  if (!raw) return null;
  if (!YMD.test(raw)) return null;
  return raw;
}
