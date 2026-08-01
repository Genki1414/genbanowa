/**
 * 作業日報。全業種共通の進捗単位（足場業に依存していた WorkTrack の代わり）。
 * headcount（人数）だけは field ロールにも常に見せる — 日報が書けなくなるため。
 */
export interface DailyReport {
  id: string;
  workDate: string;
  headcount: number;
  content: string;
  note?: string;
  createdBy?: string;
}

/** 対象月ごとの延べ人工を集計する（人工精算の請求に使う）。 */
export function ninkuByMonth(reports: DailyReport[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const r of reports) {
    const month = r.workDate.slice(0, 7);
    if (!month) continue;
    totals.set(month, (totals.get(month) ?? 0) + (Number(r.headcount) || 0));
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
}
