/** "2026-09-01" → "9/1" */
export const fmt = (iso: string | null | undefined): string =>
  iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : "—";

export const range = (a: string | null | undefined, b: string | null | undefined): string =>
  `${fmt(a)}〜${fmt(b)}`;

/** 期日超過かどうか（当日は超過に含めない）。 */
export const overdue = (dueDate: string, today: string): boolean => today > dueDate;

/** ISO日付から月初日を取り出す。usage_counters の period キーに使う。 */
export const monthStart = (iso: string): string => `${iso.slice(0, 7)}-01`;
