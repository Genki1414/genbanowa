/**
 * プラン定義。
 *
 * 値は 00_CLAUDE_CODE_キックオフ.md 5章のものをそのまま採用（「そのままコードに入れてよい」と明記）。
 * ただし std の月額はプロトタイプ(.jsx)では ¥3,000、キックオフ指示書では ¥2,980 になっており、
 * この2つは食い違っている。指示書の値を暫定採用したが、要確認（実装キックオフ指示書9章の方針どおり報告する）。
 *
 * 数値は変更前提。本番では plan_limits テーブルで持ち、ここにハードコードしない。
 * このファイルはドメイン層の型・シード値・vitest 用の参照実装として置く。
 */

export const INF = Infinity;

export type PlanKey = "free" | "std" | "pro" | "prem";

export interface PlanLimits {
  key: PlanKey;
  name: string;
  price: number;
  /** 案件詳細の閲覧（月）。同じ案件の再閲覧は消費しない */
  detail: number;
  /** やり取りできる案件数。その月に新規開始した会話数で数える */
  send: number;
  /** スカウトの閲覧。"pt" は閲覧ポイント制（無料のみ・月次リセットなし） */
  recv: number | "pt";
  /** スカウト送信（月） */
  scout: number;
  /** 案件投稿（月） */
  post: number;
  /** 掲載中の空き情報の件数（同時） */
  aki: number;
  /** 現場フォルダの件数（同時・アーカイブ除く） */
  site: number;
  /** 写真の保存容量（GB） */
  gb: number;
  /** 金額を扱えるユーザー数。field ロールは無制限（このカウントに含めない） */
  users: number;
  /** 書類の発行可否 */
  docs: boolean;
  /** 会社情報の開示レベル 0=基本 1=取引実績 2=+運営評価/HP 3=+支払実績 */
  info: 0 | 1 | 2 | 3;
}

export const PLANS: Record<PlanKey, PlanLimits> = {
  free: { key: "free", name: "無料", price: 0, detail: 3, send: 1, recv: "pt", scout: 1, post: 1, aki: 1, site: 2, gb: 1, users: 1, docs: false, info: 0 },
  std: { key: "std", name: "スタンダード", price: 2980, detail: INF, send: 5, recv: INF, scout: 5, post: INF, aki: 3, site: 5, gb: 10, users: 3, docs: true, info: 1 },
  pro: { key: "pro", name: "プロ", price: 5000, detail: INF, send: 15, recv: INF, scout: 15, post: INF, aki: 6, site: 15, gb: 50, users: 10, docs: true, info: 2 },
  prem: { key: "prem", name: "プレミアム", price: 10000, detail: INF, send: 40, recv: INF, scout: 40, post: INF, aki: INF, site: INF, gb: INF, users: INF, docs: true, info: 3 },
};

export const RANK: Record<PlanKey, number> = { free: 0, std: 1, pro: 2, prem: 3 };

export const lim = (n: number): string => (n === INF ? "無制限" : String(n));
