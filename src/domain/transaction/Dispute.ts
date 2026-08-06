import { InvoiceStatus } from "./Invoice";

/**
 * 入金確認・異議申立。docs/03_規約・信用情報方針ドラフト.md 4-4章の手続きをそのまま状態にした。
 * 「支払期日を過ぎた」だけでは遅延として記録しない（CLAUDE.md「絶対に守ること」3）。
 * 'recorded' への遷移は運営の record_payment_delay() 経由のみで、ここでは判定しない。
 */
export type DisputeStatus = "overdue" | "confirming" | "date_proposed" | "objected" | "under_review" | "resolved" | "recorded";

export interface PaymentDispute {
  id: string;
  invoiceId: string;
  status: DisputeStatus;
  proposedDate?: string;
  objection?: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
}

export type DisputeActor = "uke" | "moto" | "admin" | "system";

export interface DisputeLog {
  id: string;
  disputeId: string;
  actor: DisputeActor;
  text: string;
  createdAt: string;
}

/** 期日超過かどうか（当日は超過に含めない）。domain/shared/date.tsのoverdue()と同じ基準。 */
export const isOverdue = (dueDate: string, today: string): boolean => today > dueDate;

/**
 * 受注者が「入金の確認を依頼する」を出せる状態か。
 * 入金待ちの請求で期日超過しており、進行中のdispute（未解決）がまだ無いこと。
 */
export function canRequestConfirmation(
  invoiceStatus: InvoiceStatus,
  dueDate: string,
  today: string,
  existing: PaymentDispute | null,
): boolean {
  if (invoiceStatus !== "approved" && invoiceStatus !== "paid") return false;
  if (!isOverdue(dueDate, today)) return false;
  if (existing && existing.status !== "resolved" && existing.status !== "recorded") return false;
  return true;
}

/** 発注者が回答（支払済み・支払予定日の申告・異議）できる状態か。 */
export const canRespond = (dispute: PaymentDispute): boolean => dispute.status === "confirming";

/** 受注者が、発注者の申告した支払予定日を承諾できる状態か。 */
export const canAcceptProposedDate = (dispute: PaymentDispute): boolean => dispute.status === "date_proposed";

/** 運営の事実確認に上げられる状態か（不承諾・異議・回答なしのいずれも、この操作で運営に渡す）。 */
export const canEscalate = (dispute: PaymentDispute): boolean =>
  dispute.status === "confirming" || dispute.status === "date_proposed" || dispute.status === "objected";

/** 運営が確定判断（記録する／記録しない）を下せる状態か。 */
export const canDecide = (dispute: PaymentDispute): boolean => dispute.status === "under_review";
