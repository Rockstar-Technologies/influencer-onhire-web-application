/**
 * The API sends two kinds of date strings: calendar dates ("2026-12-01": campaign start/end, birth-style fields) and full UTC timestamps
 * ("2026-10-19T00:06:02.961Z": createdAt, respondedAt, deadlines). Older screens assumed calendar dates only (they appended "T00:00:00"),
 * which turns a real timestamp into an invalid date. This parser accepts both and never returns an invalid Date.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseApiDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}
