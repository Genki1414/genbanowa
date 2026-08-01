/**
 * checkQuota() に渡す使用量。usage_counters テーブル（月次リセット分）と
 * companies.invite_points（非リセットのスカウト閲覧ポイント）を集計してここに詰める。
 */
export interface Usage {
  /** その月に閲覧した案件詳細の件数（重複閲覧は含まない） */
  detailViewedCount: number;
  /** その月に新規開始した会話数 */
  conversationsStartedThisMonth: number;
  /** その月に送ったスカウト数 */
  scoutsSentThisMonth: number;
  /** その月に投稿した案件数 */
  jobsPostedThisMonth: number;
  /** 掲載中（status='open'）の自社空き情報件数 */
  openAvailabilityCount: number;
  /** アーカイブ除く自社現場フォルダ件数 */
  activeSiteCount: number;
}

export const emptyUsage = (): Usage => ({
  detailViewedCount: 0,
  conversationsStartedThisMonth: 0,
  scoutsSentThisMonth: 0,
  jobsPostedThisMonth: 0,
  openAvailabilityCount: 0,
  activeSiteCount: 0,
});
