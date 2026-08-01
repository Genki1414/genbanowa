/**
 * 請求書。1枚の請求書に複数の注文書は載せない（orderId は単数）。取引完了まで何度でも発行できる。
 * 注文書の金額を超える請求は警告するが拒否しない（追加分を先に請求するケースがあるため）。
 */
export type InvoiceBasis = "full" | "manual" | "ninku_month";
export type InvoiceStatus = "submitted" | "approved" | "paid" | "received" | "rejected";

export interface Invoice {
  id: string;
  orderId: string;
  amount: number; // 税抜
  tax: number;
  basis: InvoiceBasis;
  targetMonth?: string; // 人工精算の対象月（YYYY-MM-01）
  ninkuTotal?: number;
  dueDate: string;
  status: InvoiceStatus;
  approvedAt: string | null;
  paidAt: string | null; // 発注側が支払を登録した時刻
  receivedAt: string | null; // 受注側が入金を確認した時刻
  receivedOn: string | null; // 実際の入金日（期日内判定に使う）
}

/** 指定の注文書に対して、これまでに請求した合計額（却下を除く）。 */
export function billedForOrder(invoices: Invoice[], orderId: string): number {
  return invoices
    .filter((v) => v.orderId === orderId && v.status !== "rejected")
    .reduce((n, v) => n + v.amount, 0);
}

/** 注文書の金額を超えているか（超過額）。0以下なら超過していない。DBでは拒否しない。UIで警告する。 */
export function overAmount(orderAmount: number, invoices: Invoice[], orderId: string): number {
  return billedForOrder(invoices, orderId) - orderAmount;
}

/**
 * 期日内入金かどうか。取引ごとに何度でもカウントできる（信用スコアの取引社数とは別軸）。
 * `received_on > due_date` の場合は、ここでは遅延と判定しない。
 * payment_disputes を通り status='recorded' になったものだけが信用情報上の遅延になる。
 */
export const isPaidOnTime = (invoice: Invoice): boolean =>
  invoice.status === "received" && invoice.receivedOn !== null && invoice.receivedOn <= invoice.dueDate;
