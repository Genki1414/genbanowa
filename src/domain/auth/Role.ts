/**
 * 04_権限ロール設計.md のロール定義。プロトタイプ(.jsx)は owner/accounting/field の3ロールのみだが、
 * 設計書は5ロール（admin, viewer を追加）を P0 で入れる前提になっている。設計書の方が新しく、
 * 「10〜30人規模」まで見据えた設計として明記されているため、5ロールで実装する。
 */
export type Role = "owner" | "admin" | "accounting" | "field" | "viewer";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "代表者",
  admin: "管理者", // owner とほぼ同権限（ユーザー管理・プラン変更以外）。10人規模以上向け
  accounting: "経理・事務",
  field: "現場担当",
  viewer: "閲覧のみ",
};

/**
 * 招待フォームの既定露出。一人親方〜数人規模ではこの2つで足りる。
 * admin・viewer は「詳細設定」の奥に置く（10人規模以上向け・段階開放と同じ思想）。
 */
export const BASIC_INVITE_ROLES: Role[] = ["accounting", "field"];
export const ADVANCED_INVITE_ROLES: Role[] = ["admin", "viewer"];

/** 金額を見られないロール。漏れると信用事故になるため、判定はこの1箇所にだけ書く。 */
export const canSeeAmount = (role: Role): boolean => role !== "field";

/** 金額を扱えるユーザー数の上限（plan.users）にカウントするロールか。field/viewerは無制限。 */
export const countsTowardUserLimit = (role: Role): boolean => role !== "field" && role !== "viewer";
