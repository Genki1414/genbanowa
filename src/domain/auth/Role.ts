/**
 * 04_権限ロール設計.md のロール定義。プロトタイプ(.jsx)は owner/accounting/field の3ロールのみだが、
 * 設計書は5ロール（admin, viewer を追加）を P0 で入れる前提になっている。設計書の方が新しく、
 * 「10〜30人規模」まで見据えた設計として明記されているため、5ロールで実装する。
 */
export type Role = "owner" | "admin" | "accounting" | "field" | "viewer";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "代表者",
  admin: "代表者", // owner とほぼ同権限。UI上の表示は代表者に揃える
  accounting: "経理・事務",
  field: "現場担当",
  viewer: "閲覧のみ",
};

/** 金額を見られないロール。漏れると信用事故になるため、判定はこの1箇所にだけ書く。 */
export const canSeeAmount = (role: Role): boolean => role !== "field";
