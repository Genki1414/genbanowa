/**
 * 現場フォルダ・工事写真。UIに依存しない型と純粋関数だけを置く。
 */
export type Koutei = "着手前" | "施工中" | "施工後" | "完了検査";

export const KOUTEI_OPTIONS: Koutei[] = ["着手前", "施工中", "施工後", "完了検査"];

/** 工種のよくある選択肢。自由入力も可（プロトタイプと同じ方針）。 */
export const KOUSHU_SUGGESTIONS = ["外部足場", "外壁塗装", "解体", "内装", "基礎", "屋根"];

export interface Site {
  id: string;
  companyId: string;
  transactionId?: string;
  name: string;
  address?: string;
  createdAt: string;
  archivedAt?: string;
}

export interface Photo {
  id: string;
  siteId: string;
  koushu: string;
  koutei: Koutei;
  spot?: string;
  shotAt: string;
  filePath: string;
  createdAt: string;
}

export const isActive = (site: Site): boolean => !site.archivedAt;

/** 現場詳細画面の「工種フォルダ」一覧。工種ごとに写真をまとめ、初出順を保つ。 */
export function groupByKoushu(photos: Photo[]): { koushu: string; photos: Photo[] }[] {
  const order: string[] = [];
  const byKoushu = new Map<string, Photo[]>();
  for (const p of photos) {
    if (!byKoushu.has(p.koushu)) {
      byKoushu.set(p.koushu, []);
      order.push(p.koushu);
    }
    byKoushu.get(p.koushu)!.push(p);
  }
  return order.map((koushu) => ({ koushu, photos: byKoushu.get(koushu)! }));
}

/** 工種フォルダ内で、工程（着手前→完了検査の順）ごとにまとめる。 */
export function groupByKoutei(photos: Photo[]): { koutei: Koutei; photos: Photo[] }[] {
  return KOUTEI_OPTIONS.map((koutei) => ({ koutei, photos: photos.filter((p) => p.koutei === koutei) })).filter(
    (g) => g.photos.length > 0,
  );
}
