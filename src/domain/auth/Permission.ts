import { Role } from "./Role";

/**
 * 04_権限ロール設計.md 2章の権限マトリクスをそのまま実装したもの。
 * UIやServer Actionは can() の結果だけを見て、role を直接比較しないこと。
 *
 * 「担当のみ」の行（取引一覧・メッセージ・写真）は、ロールとしては true にした上で、
 * 実際の絞り込みは site_assignments（担当割り当て）を使ったデータ層のスコープで行う。
 * can() はロール単位の可否だけを返す。
 */
export type Action =
  // 取引
  | "transaction.list"
  | "amount.view"
  | "order.issue"
  | "order.accept"
  | "order.reject"
  | "order.requestAdditional"
  | "report.write"
  | "invoice.create"
  | "invoice.approve"
  | "payment.register"
  | "receipt.confirm"
  | "completion.request"
  | "completion.approve"
  | "dispute.request"
  | "dispute.object"
  // 案件・スカウト・メッセージ
  | "job.search"
  | "job.apply"
  | "job.post"
  | "availability.manage"
  | "scout.send"
  | "scout.read"
  | "message.read"
  | "message.send"
  | "transaction.request"
  // 現場・写真
  | "site.create"
  | "site.delete"
  | "photo.capture"
  | "photo.view"
  | "photo.exportPdf"
  // 現場担当の割り当て（04_権限ロール設計.md 3章「割り当ては owner / admin / accounting が行う」）
  | "assignment.manage"
  // 会社・信用・プラン
  | "company.edit"
  | "trustDocument.submit"
  | "company.viewTrust"
  | "company.viewPayment"
  | "partner.manage"
  | "user.invite"
  | "user.remove"
  | "role.change"
  | "plan.change";

type Matrix = Record<Action, Record<Role, boolean>>;

const T = true;
const F = false;

const MATRIX: Matrix = {
  "transaction.list": { owner: T, admin: T, accounting: T, field: T, viewer: T },
  "amount.view": { owner: T, admin: T, accounting: T, field: F, viewer: T },
  "order.issue": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "order.accept": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "order.reject": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "order.requestAdditional": { owner: T, admin: T, accounting: T, field: T, viewer: F },
  "report.write": { owner: T, admin: T, accounting: F, field: T, viewer: F },
  "invoice.create": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  // accounting は金額の上限つき（既定50万円）。超える場合は owner/admin の承認が必要 → requiresOwnerApproval() で判定
  "invoice.approve": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "payment.register": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "receipt.confirm": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "completion.request": { owner: T, admin: T, accounting: T, field: T, viewer: F },
  "completion.approve": { owner: T, admin: T, accounting: F, field: F, viewer: F },
  "dispute.request": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "dispute.object": { owner: T, admin: T, accounting: F, field: F, viewer: F },

  "job.search": { owner: T, admin: T, accounting: T, field: T, viewer: T },
  "job.apply": { owner: T, admin: T, accounting: F, field: F, viewer: F },
  "job.post": { owner: T, admin: T, accounting: F, field: F, viewer: F },
  "availability.manage": { owner: T, admin: T, accounting: F, field: T, viewer: F },
  "scout.send": { owner: T, admin: T, accounting: F, field: F, viewer: F },
  "scout.read": { owner: T, admin: T, accounting: T, field: F, viewer: T },
  "message.read": { owner: T, admin: T, accounting: T, field: T, viewer: T },
  "message.send": { owner: T, admin: T, accounting: T, field: T, viewer: F },
  "transaction.request": { owner: T, admin: T, accounting: F, field: F, viewer: F },

  "site.create": { owner: T, admin: T, accounting: T, field: T, viewer: F },
  "site.delete": { owner: T, admin: T, accounting: F, field: F, viewer: F },
  "photo.capture": { owner: T, admin: T, accounting: F, field: T, viewer: F },
  "photo.view": { owner: T, admin: T, accounting: T, field: T, viewer: T },
  "photo.exportPdf": { owner: T, admin: T, accounting: T, field: T, viewer: T },
  "assignment.manage": { owner: T, admin: T, accounting: T, field: F, viewer: F },

  "company.edit": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "trustDocument.submit": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "company.viewTrust": { owner: T, admin: T, accounting: T, field: F, viewer: T },
  "company.viewPayment": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "partner.manage": { owner: T, admin: T, accounting: T, field: F, viewer: F },
  "user.invite": { owner: T, admin: F, accounting: F, field: F, viewer: F },
  "user.remove": { owner: T, admin: F, accounting: F, field: F, viewer: F },
  "role.change": { owner: T, admin: F, accounting: F, field: F, viewer: F },
  "plan.change": { owner: T, admin: F, accounting: F, field: F, viewer: F },
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[action][role];
}

/**
 * 請求承認の金額上限（既定50万円。会社ごとに設定変更可 — companies.invoice_approval_limit）。
 * accounting はこの額を超える請求を単独では承認できず、owner/admin の承認が必要になる。
 */
export const DEFAULT_INVOICE_APPROVAL_LIMIT = 500_000;

export function requiresOwnerApproval(
  role: Role,
  amount: number,
  limit: number = DEFAULT_INVOICE_APPROVAL_LIMIT,
): boolean {
  if (role === "owner" || role === "admin") return false;
  return amount > limit;
}
