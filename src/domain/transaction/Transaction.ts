import { Role, canSeeAmount } from "@/domain/auth/Role";
import { can, requiresOwnerApproval, Action as PermissionAction } from "@/domain/auth/Permission";
import { Result, ok, err } from "@/domain/shared/result";
import { Order, OrderKeishiki, isAccepted, isPending, nextSeq } from "./Order";
import { OrderRequest } from "./OrderRequest";
import { DailyReport } from "./DailyReport";
import { Invoice, InvoiceBasis, overAmount as computeOverAmount } from "./Invoice";

export type TransactionStatus = "active" | "completion_requested" | "completed" | "cancelled";

export interface Actor {
  companyId: string;
  role: Role;
}

export interface TransactionProps {
  id: string;
  title: string;
  motoCompanyId: string; // 発注側
  ukeCompanyId: string; // 受注側
  closingDay?: string;
  paymentTerms?: string;
  status: TransactionStatus;
  orders: Order[];
  orderRequests: OrderRequest[];
  dailyReports: DailyReport[];
  invoices: Invoice[];
  createdAt: string;
  completedAt: string | null;
}

export interface AddOrderInput {
  keishiki: OrderKeishiki;
  amount?: number;
  tanka?: number;
  kokiFrom: string;
  kokiTo: string;
  siteAddress?: string;
  paymentTerms: string;
  note?: string;
  fulfillsRequestId?: string;
}

export interface AddOrderRequestInput {
  description: string;
  estAmount?: number;
  kokiFrom?: string;
  kokiTo?: string;
}

export interface AddReportInput {
  workDate: string;
  headcount: number;
  content: string;
  note?: string;
  createdBy?: string;
}

export interface SubmitInvoiceInput {
  orderId: string;
  amount: number;
  tax: number;
  basis: InvoiceBasis;
  dueDate: string;
  targetMonth?: string;
  ninkuTotal?: number;
}

type Side = "moto" | "uke" | null;

/**
 * 一覧・詳細でのステータス表示用の意味づけ。色（ki/midori/aka/usu）はUIの責務なので
 * ここでは返さない（domainはUIに依存しない）。
 */
export type TxDisplayStatus = "awaiting_acceptance" | "in_progress" | "completion_requested" | "completed" | "cancelled";

export function transactionDisplayStatus(status: TransactionStatus, orders: Order[]): TxDisplayStatus {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "completion_requested") return "completion_requested";
  return orders.some(isPending) ? "awaiting_acceptance" : "in_progress";
}

let idSeq = 0;
/** テストや呼び出し側でIDを指定しない場合の採番。本番はDB側のUUID採番を使う。 */
function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}_${idSeq}`;
}

/**
 * 取引の集約。availableActions() が「何ができるか」の唯一の真実。
 * UIやServer Actionはここの判定結果だけを見て、role や status を自分で比較しない
 * （08_リファクタ分割設計.md 4章）。
 */
export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  static create(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  get id() { return this.props.id; }
  get title() { return this.props.title; }
  get status() { return this.props.status; }
  get motoCompanyId() { return this.props.motoCompanyId; }
  get ukeCompanyId() { return this.props.ukeCompanyId; }
  get orders() { return this.props.orders; }
  get orderRequests() { return this.props.orderRequests; }
  get dailyReports() { return this.props.dailyReports; }
  get invoices() { return this.props.invoices; }
  get completedAt() { return this.props.completedAt; }

  toProps(): TransactionProps {
    return { ...this.props };
  }

  private sideOf(actor: Actor): Side {
    if (actor.companyId === this.props.motoCompanyId) return "moto";
    if (actor.companyId === this.props.ukeCompanyId) return "uke";
    return null;
  }

  private with(patch: Partial<TransactionProps>): Transaction {
    return new Transaction({ ...this.props, ...patch });
  }

  /** 指定した注文書のこれまでの請求超過額（0以下なら超過していない）。 */
  overAmount(orderId: string): number {
    const order = this.props.orders.find((o) => o.id === orderId);
    if (!order) return 0;
    return computeOverAmount(order.amount, this.props.invoices, orderId);
  }

  /** field ロールには金額を一切渡さない。Server Action からの応答はこれを通してから返す。 */
  stripAmounts(role: Role): TransactionProps {
    if (canSeeAmount(role)) return this.toProps();
    return {
      ...this.props,
      orders: this.props.orders.map((o) => ({ ...o, amount: 0, tanka: 0 })),
      invoices: this.props.invoices.map((v) => ({ ...v, amount: 0, tax: 0 })),
      orderRequests: this.props.orderRequests.map((r) => ({ ...r, estAmount: 0 })),
    };
  }

  // ── 注文書 ──────────────────────────────────────────

  addOrder(input: AddOrderInput, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "moto") return err("NOT_MOTO");
    if (!can(actor.role, "order.issue")) return err("PERMISSION_DENIED");
    if (this.props.status === "completed" || this.props.status === "cancelled") {
      return err("TRANSACTION_CLOSED");
    }

    const order: Order = {
      id: nextId("order"),
      seq: nextSeq(this.props.orders),
      keishiki: input.keishiki,
      amount: input.amount ?? 0,
      tanka: input.tanka ?? 0,
      kokiFrom: input.kokiFrom,
      kokiTo: input.kokiTo,
      siteAddress: input.siteAddress,
      paymentTerms: input.paymentTerms,
      note: input.note,
      issuedAt: at,
      acceptedAt: null,
      rejectedAt: null,
    };

    let orderRequests = this.props.orderRequests;
    if (input.fulfillsRequestId) {
      const request = orderRequests.find((r) => r.id === input.fulfillsRequestId);
      if (!request) return err("ORDER_REQUEST_NOT_FOUND");
      orderRequests = orderRequests.map((r) =>
        r.id === input.fulfillsRequestId ? { ...r, status: "issued", issuedOrderId: order.id } : r,
      );
    }

    return ok(this.with({ orders: [...this.props.orders, order], orderRequests }));
  }

  acceptOrder(orderId: string, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "uke") return err("NOT_UKE");
    if (!can(actor.role, "order.accept")) return err("PERMISSION_DENIED");

    const order = this.props.orders.find((o) => o.id === orderId);
    if (!order) return err("ORDER_NOT_FOUND");
    if (!isPending(order)) return err("ORDER_ALREADY_DECIDED");

    const orders = this.props.orders.map((o) => (o.id === orderId ? { ...o, acceptedAt: at } : o));
    return ok(this.with({ orders }));
  }

  rejectOrder(orderId: string, note: string, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "uke") return err("NOT_UKE");
    if (!can(actor.role, "order.reject")) return err("PERMISSION_DENIED");

    const order = this.props.orders.find((o) => o.id === orderId);
    if (!order) return err("ORDER_NOT_FOUND");
    if (!isPending(order)) return err("ORDER_ALREADY_DECIDED");

    const orders = this.props.orders.map((o) =>
      o.id === orderId ? { ...o, rejectedAt: at, rejectNote: note } : o,
    );
    return ok(this.with({ orders }));
  }

  requestAdditionalOrder(input: AddOrderRequestInput, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "uke") return err("NOT_UKE");
    if (!can(actor.role, "order.requestAdditional")) return err("PERMISSION_DENIED");

    const request: OrderRequest = {
      id: nextId("orderRequest"),
      description: input.description,
      estAmount: input.estAmount ?? 0,
      kokiFrom: input.kokiFrom,
      kokiTo: input.kokiTo,
      status: "requested",
      issuedOrderId: null,
      createdAt: at,
    };
    return ok(this.with({ orderRequests: [...this.props.orderRequests, request] }));
  }

  // ── 作業日報 ──────────────────────────────────────────

  addReport(input: AddReportInput, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "uke") return err("NOT_UKE");
    if (!can(actor.role, "report.write")) return err("PERMISSION_DENIED");

    const report: DailyReport = {
      id: nextId("report"),
      workDate: input.workDate,
      headcount: input.headcount,
      content: input.content,
      note: input.note,
      createdBy: input.createdBy,
    };
    void at;
    return ok(this.with({ dailyReports: [...this.props.dailyReports, report] }));
  }

  // ── 請求 ──────────────────────────────────────────

  /**
   * 請書が返っていない注文書には請求できない。
   * 注文書の金額を超える請求は警告の対象だが、ここでは拒否しない（呼び出し側が overAmount() を見て警告する）。
   */
  submitInvoice(input: SubmitInvoiceInput, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "uke") return err("NOT_UKE");
    if (!can(actor.role, "invoice.create")) return err("PERMISSION_DENIED");

    const order = this.props.orders.find((o) => o.id === input.orderId);
    if (!order) return err("ORDER_NOT_FOUND");
    if (!isAccepted(order)) return err("ORDER_NOT_ACCEPTED");

    const invoice: Invoice = {
      id: nextId("invoice"),
      orderId: input.orderId,
      amount: input.amount,
      tax: input.tax,
      basis: input.basis,
      targetMonth: input.targetMonth,
      ninkuTotal: input.ninkuTotal,
      dueDate: input.dueDate,
      status: "submitted",
      approvedAt: null,
      paidAt: null,
      receivedAt: null,
      receivedOn: null,
      rejectedAt: null,
    };
    void at;
    return ok(this.with({ invoices: [...this.props.invoices, invoice] }));
  }

  /**
   * 請求書の差し戻し。削除ではなく、記録を残したまま無効化する
   * （CLAUDE.md「絶対に守ること」4：書類は送信後に変更できない。訂正は差し戻しか新規発行）。
   * 却下された請求は再度、新規の請求書として出し直す。
   */
  rejectInvoice(invoiceId: string, note: string, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "moto") return err("NOT_MOTO");
    if (!can(actor.role, "invoice.reject")) return err("PERMISSION_DENIED");

    const invoice = this.props.invoices.find((v) => v.id === invoiceId);
    if (!invoice) return err("INVOICE_NOT_FOUND");
    if (invoice.status !== "submitted") return err("INVOICE_NOT_SUBMITTED");

    const invoices = this.props.invoices.map((v) =>
      v.id === invoiceId ? { ...v, status: "rejected" as const, rejectedAt: at, rejectNote: note } : v,
    );
    return ok(this.with({ invoices }));
  }

  approveInvoice(invoiceId: string, actor: Actor, at: string, approvalLimit?: number): Result<Transaction> {
    if (this.sideOf(actor) !== "moto") return err("NOT_MOTO");
    if (!can(actor.role, "invoice.approve")) return err("PERMISSION_DENIED");

    const invoice = this.props.invoices.find((v) => v.id === invoiceId);
    if (!invoice) return err("INVOICE_NOT_FOUND");
    if (invoice.status !== "submitted") return err("INVOICE_NOT_SUBMITTED");
    if (requiresOwnerApproval(actor.role, invoice.amount, approvalLimit)) {
      return err("EXCEEDS_APPROVAL_LIMIT");
    }

    const invoices = this.props.invoices.map((v) =>
      v.id === invoiceId ? { ...v, status: "approved" as const, approvedAt: at } : v,
    );
    return ok(this.with({ invoices }));
  }

  registerPayment(invoiceId: string, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "moto") return err("NOT_MOTO");
    if (!can(actor.role, "payment.register")) return err("PERMISSION_DENIED");

    const invoice = this.props.invoices.find((v) => v.id === invoiceId);
    if (!invoice) return err("INVOICE_NOT_FOUND");
    if (invoice.status !== "approved") return err("INVOICE_NOT_APPROVED");

    const invoices = this.props.invoices.map((v) =>
      v.id === invoiceId ? { ...v, status: "paid" as const, paidAt: at } : v,
    );
    return ok(this.with({ invoices }));
  }

  /** 期日内の入金は取引ごとに何度でもカウントされる。ここでは receivedOn を記録するだけで、
   * 遅延の確定は payment_disputes 側（P6）の役割。 */
  confirmReceipt(invoiceId: string, receivedOn: string, actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "uke") return err("NOT_UKE");
    if (!can(actor.role, "receipt.confirm")) return err("PERMISSION_DENIED");

    const invoice = this.props.invoices.find((v) => v.id === invoiceId);
    if (!invoice) return err("INVOICE_NOT_FOUND");
    if (invoice.status !== "paid") return err("INVOICE_NOT_PAID");

    const invoices = this.props.invoices.map((v) =>
      v.id === invoiceId ? { ...v, status: "received" as const, receivedAt: at, receivedOn } : v,
    );
    return ok(this.with({ invoices }));
  }

  // ── 完了 ──────────────────────────────────────────

  requestCompletion(actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "uke") return err("NOT_UKE");
    if (!can(actor.role, "completion.request")) return err("PERMISSION_DENIED");
    if (this.props.status !== "active") return err("INVALID_STATUS");

    void at;
    return ok(this.with({ status: "completion_requested" }));
  }

  /** 完了承認時に TransactionCompleted 相当のイベントが発火し、信用スコアを再計算する（呼び出し側の責務）。 */
  approveCompletion(actor: Actor, at: string): Result<Transaction> {
    if (this.sideOf(actor) !== "moto") return err("NOT_MOTO");
    if (!can(actor.role, "completion.approve")) return err("PERMISSION_DENIED");
    if (this.props.status !== "completion_requested") return err("INVALID_STATUS");

    return ok(this.with({ status: "completed", completedAt: at }));
  }

  // ── UIの根拠 ──────────────────────────────────────────

  /**
   * 「何ができるか」の唯一の真実。UIのボタン表示・Server Actionの入口チェックはこれだけを見る。
   * 担当のみ（field の一覧・メッセージ・写真の絞り込み）はここでは判定しない — データ層のスコープの仕事。
   */
  availableActions(actor: Actor): PermissionAction[] {
    const side = this.sideOf(actor);
    if (!side) return [];

    const actions: PermissionAction[] = [];
    const push = (action: PermissionAction, allowed: boolean) => {
      if (allowed && can(actor.role, action)) actions.push(action);
    };

    const pendingOrder = this.props.orders.some(isPending);
    const hasAcceptedOrder = this.props.orders.some(isAccepted);
    const submittedInvoice = this.props.invoices.some((v) => v.status === "submitted");
    const approvedInvoice = this.props.invoices.some((v) => v.status === "approved");
    const paidInvoice = this.props.invoices.some((v) => v.status === "paid");
    const notClosed = this.props.status !== "completed" && this.props.status !== "cancelled";

    push("order.issue", side === "moto" && notClosed);
    push("order.accept", side === "uke" && pendingOrder);
    push("order.reject", side === "uke" && pendingOrder);
    push("order.requestAdditional", side === "uke" && notClosed);
    push("report.write", side === "uke" && notClosed);
    push("invoice.create", side === "uke" && hasAcceptedOrder && notClosed);
    push("invoice.approve", side === "moto" && submittedInvoice);
    push("invoice.reject", side === "moto" && submittedInvoice);
    push("payment.register", side === "moto" && approvedInvoice);
    push("receipt.confirm", side === "uke" && paidInvoice);
    push("completion.request", side === "uke" && this.props.status === "active");
    push("completion.approve", side === "moto" && this.props.status === "completion_requested");
    push("dispute.request", side === "uke");
    push("dispute.object", side === "moto");

    return actions;
  }
}
