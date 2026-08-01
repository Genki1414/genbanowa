import { PlanLimits, INF } from "./Plan";
import { Usage } from "./Usage";

/**
 * 上限判定はすべてここに集約する。UIやServer Actionで直接 `plan.detail > n` のような
 * 比較をしないこと（08_リファクタ分割設計.md 3章）。
 */
export type QuotaKey =
  | "job.detail"
  | "conversation.start"
  | "scout.send"
  | "job.post"
  | "availability.slot"
  | "site.slot"
  | "document.issue"
  | "user.invite";

export type QuotaResult = { ok: true } | { ok: false; reason: string; limit: number | "unlimited" };

const withinLimit = (used: number, limit: number, label: string): QuotaResult => {
  if (limit === INF) return { ok: true };
  if (used < limit) return { ok: true };
  return { ok: false, reason: `${label}の上限（${limit}）に達しています`, limit };
};

/**
 * `job.detail` と `conversation.start` は「既に消費済みの対象を再度触っても消費しない」ルールがある
 * （同じ案件の再閲覧・既存の会話は無制限）。呼び出し側がそのIDが既知かどうかを事前に判定し、
 * 既知であればそもそも checkQuota を呼ばずに許可してよい。ここでは「新規に1件消費するとして
 * 上限内か」だけを判定する。
 */
export function checkQuota(plan: PlanLimits, usage: Usage, key: QuotaKey): QuotaResult {
  switch (key) {
    case "job.detail":
      return withinLimit(usage.detailViewedCount, plan.detail, "案件詳細の閲覧");
    case "conversation.start":
      return withinLimit(usage.conversationsStartedThisMonth, plan.send, "やり取り");
    case "scout.send":
      return withinLimit(usage.scoutsSentThisMonth, plan.scout, "スカウト送信");
    case "job.post":
      return withinLimit(usage.jobsPostedThisMonth, plan.post, "案件投稿");
    case "availability.slot":
      return withinLimit(usage.openAvailabilityCount, plan.aki, "空き情報の同時掲載");
    case "site.slot":
      return withinLimit(usage.activeSiteCount, plan.site, "現場フォルダ");
    case "document.issue":
      return plan.docs ? { ok: true } : { ok: false, reason: "このプランでは書類を発行できません", limit: 0 };
    case "user.invite":
      return withinLimit(usage.paidUserCount, plan.users, "金額を扱えるユーザー数");
  }
}

/**
 * スカウト・見積依頼の閲覧。無料プランのみポイント制（非リセット）。
 * 有料プランは recv=INF で常に閲覧できる。月次カウンタではないため checkQuota() とは分けている。
 */
export function checkScoutView(
  plan: PlanLimits,
  invitePoints: number,
  alreadyOpened: boolean,
): QuotaResult {
  if (alreadyOpened) return { ok: true };
  if (plan.recv !== "pt") return { ok: true };
  if (invitePoints > 0) return { ok: true };
  return { ok: false, reason: "スカウト閲覧ポイントがありません。プロフィールを充実させると増えます", limit: 0 };
}
