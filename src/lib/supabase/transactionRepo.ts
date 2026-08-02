import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import {
  Transaction,
  TransactionProps,
  TransactionStatus,
  TxDisplayStatus,
  transactionDisplayStatus,
} from "@/domain/transaction/Transaction";
import { Role, canSeeAmount } from "@/domain/auth/Role";
import { Order } from "@/domain/transaction/Order";
import { OrderRequest } from "@/domain/transaction/OrderRequest";
import { DailyReport } from "@/domain/transaction/DailyReport";
import { Invoice } from "@/domain/transaction/Invoice";

export type Client = SupabaseClient<Database>;

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderRequestRow = Database["public"]["Tables"]["order_requests"]["Row"];
type DailyReportRow = Database["public"]["Tables"]["daily_reports"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    seq: row.seq,
    keishiki: row.keishiki,
    amount: row.amount,
    tanka: row.tanka,
    kokiFrom: row.koki_from,
    kokiTo: row.koki_to,
    siteAddress: row.site_address ?? undefined,
    paymentTerms: row.payment_terms,
    note: row.note ?? undefined,
    issuedAt: row.issued_at,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    rejectNote: row.reject_note ?? undefined,
  };
}

function toOrderRequest(row: OrderRequestRow): OrderRequest {
  return {
    id: row.id,
    description: row.description,
    estAmount: row.est_amount,
    kokiFrom: row.koki_from ?? undefined,
    kokiTo: row.koki_to ?? undefined,
    status: row.status,
    issuedOrderId: row.issued_order,
    createdAt: row.created_at,
  };
}

function toDailyReport(row: DailyReportRow): DailyReport {
  return {
    id: row.id,
    workDate: row.work_date,
    headcount: row.headcount,
    content: row.content,
    note: row.note ?? undefined,
    createdBy: row.created_by ?? undefined,
  };
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    orderId: row.order_id,
    amount: row.amount,
    tax: row.tax,
    basis: row.basis,
    targetMonth: row.target_month ?? undefined,
    ninkuTotal: row.ninku_total ?? undefined,
    dueDate: row.due_date,
    status: row.status,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    receivedAt: row.received_at,
    receivedOn: row.received_on,
  };
}

/** 取引と紐づく注文書・日報・請求書をまとめて読み、ドメインの集約に組み立てる。 */
export async function loadTransaction(supabase: Client, id: string): Promise<Transaction | null> {
  const { data: txRow } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (!txRow) return null;

  const [orders, orderRequests, dailyReports, invoices] = await Promise.all([
    supabase.from("orders").select("*").eq("transaction_id", id).order("seq"),
    supabase.from("order_requests").select("*").eq("transaction_id", id).order("created_at"),
    supabase.from("daily_reports").select("*").eq("transaction_id", id).order("work_date"),
    supabase.from("invoices").select("*").eq("transaction_id", id).order("created_at"),
  ]);

  const props: TransactionProps = {
    id: txRow.id,
    title: txRow.title,
    motoCompanyId: txRow.moto_company,
    ukeCompanyId: txRow.uke_company,
    closingDay: txRow.closing_day ?? undefined,
    paymentTerms: txRow.payment_terms ?? undefined,
    status: txRow.status,
    orders: (orders.data ?? []).map(toOrder),
    orderRequests: (orderRequests.data ?? []).map(toOrderRequest),
    dailyReports: (dailyReports.data ?? []).map(toDailyReport),
    invoices: (invoices.data ?? []).map(toInvoice),
    createdAt: txRow.created_at,
    completedAt: txRow.completed_at,
  };
  return Transaction.create(props);
}

export interface TransactionSummary {
  id: string;
  title: string;
  partnerCompanyId: string;
  partnerCompanyName: string;
  side: "moto" | "uke";
  status: TransactionStatus;
  displayStatus: TxDisplayStatus;
  totalAmount: number;
  createdAt: string;
}

/**
 * 一覧表示用。RLSが自社の取引だけを返すので、companyIdでの絞り込みは相手方の判定にだけ使う。
 * totalAmount は field ロールに対してはここで0にする（呼び出し側のJSXが出し分けるだけに頼らない。
 * 「絶対に守ること」1: 金額の秘匿はサーバー側で落とす）。
 */
export async function loadTransactionSummaries(
  supabase: Client,
  myCompanyId: string,
  role: Role,
): Promise<TransactionSummary[]> {
  const { data: txRows } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
  if (!txRows || txRows.length === 0) return [];

  const ids = txRows.map((t) => t.id);
  const { data: orderRows } = await supabase.from("orders").select("*").in("transaction_id", ids);
  const ordersByTx = new Map<string, OrderRow[]>();
  for (const o of orderRows ?? []) {
    ordersByTx.set(o.transaction_id, [...(ordersByTx.get(o.transaction_id) ?? []), o]);
  }

  const partnerIds = [...new Set(txRows.map((t) => (t.moto_company === myCompanyId ? t.uke_company : t.moto_company)))];
  const { data: partnerRows } = await supabase.from("companies").select("id, name").in("id", partnerIds);
  const nameById = new Map((partnerRows ?? []).map((c) => [c.id, c.name]));

  return txRows.map((t) => {
    const orders = (ordersByTx.get(t.id) ?? []).map(toOrder);
    const partnerCompanyId = t.moto_company === myCompanyId ? t.uke_company : t.moto_company;
    return {
      id: t.id,
      title: t.title,
      partnerCompanyId,
      partnerCompanyName: nameById.get(partnerCompanyId) ?? "—",
      side: t.moto_company === myCompanyId ? ("moto" as const) : ("uke" as const),
      status: t.status,
      displayStatus: transactionDisplayStatus(t.status, orders),
      totalAmount: canSeeAmount(role) ? orders.reduce((n, o) => n + (o.keishiki === "ukeoi" ? o.amount : 0), 0) : 0,
      createdAt: t.created_at,
    };
  });
}

export async function insertOrderRow(supabase: Client, transactionId: string, order: Order) {
  return supabase
    .from("orders")
    .insert({
      transaction_id: transactionId,
      seq: order.seq,
      keishiki: order.keishiki,
      amount: order.amount,
      tanka: order.tanka,
      koki_from: order.kokiFrom,
      koki_to: order.kokiTo,
      site_address: order.siteAddress ?? null,
      payment_terms: order.paymentTerms,
      note: order.note ?? null,
      issued_at: order.issuedAt,
    })
    .select("id")
    .single();
}

export async function insertOrderRequestRow(supabase: Client, transactionId: string, request: OrderRequest) {
  return supabase
    .from("order_requests")
    .insert({
      transaction_id: transactionId,
      description: request.description,
      est_amount: request.estAmount,
      koki_from: request.kokiFrom ?? null,
      koki_to: request.kokiTo ?? null,
      status: request.status,
      created_at: request.createdAt,
    })
    .select("id")
    .single();
}

export async function insertDailyReportRow(supabase: Client, transactionId: string, report: DailyReport) {
  return supabase.from("daily_reports").insert({
    transaction_id: transactionId,
    work_date: report.workDate,
    headcount: report.headcount,
    content: report.content,
    note: report.note ?? null,
    created_by: report.createdBy ?? null,
  });
}

export async function insertInvoiceRow(supabase: Client, transactionId: string, invoice: Invoice) {
  return supabase
    .from("invoices")
    .insert({
      transaction_id: transactionId,
      order_id: invoice.orderId,
      amount: invoice.amount,
      tax: invoice.tax,
      basis: invoice.basis,
      target_month: invoice.targetMonth ?? null,
      ninku_total: invoice.ninkuTotal ?? null,
      due_date: invoice.dueDate,
      status: invoice.status,
    })
    .select("id")
    .single();
}
