"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import {
  loadTransaction,
  insertOrderRow,
  insertOrderRequestRow,
  insertDailyReportRow,
  insertInvoiceRow,
  Client,
} from "@/lib/supabase/transactionRepo";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";
import {
  Transaction,
  AddOrderInput,
  AddOrderRequestInput,
  AddReportInput,
  SubmitInvoiceInput,
} from "@/domain/transaction/Transaction";

async function unlockForBoth(supabase: Client, companyA: string, companyB: string, key: string) {
  await Promise.all([
    supabase.rpc("unlock_feature", { p_company: companyA, p_key: key }),
    supabase.rpc("unlock_feature", { p_company: companyB, p_key: key }),
  ]);
}

/**
 * 注文書・注文請書・請求書はいずれも「書類」。plan_limits の docs=false（無料プラン）では発行できない。
 * 判定は checkQuota() に集約する（CLAUDE.md「絶対に守ること」7）。
 */
async function requireDocumentQuota(supabase: Client, companyId: string): Promise<Result<null>> {
  const plan = await getCompanyPlan(supabase, companyId);
  const quota = checkQuota(plan, emptyUsage(), "document.issue");
  if (!quota.ok) return err(quota.reason);
  return ok(null);
}

/**
 * 取引はメッセージからしか始まらない。取引タブから単独で注文書は作れない
 * （CLAUDE.md「絶対に守ること」5）。会話の当事者のうち、注文書を出す側（自分）が発注側になる。
 */
export async function createTransactionAction(
  conversationId: string,
  input: { title: string; closingDay?: string } & AddOrderInput,
): Promise<Result<{ transactionId: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "transaction.request")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const quota = await requireDocumentQuota(supabase, actor.companyId);
  if (!quota.ok) return quota;

  const { data: conv } = await supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle();
  if (!conv) return err("CONVERSATION_NOT_FOUND");
  if (conv.company_a !== actor.companyId && conv.company_b !== actor.companyId) {
    return err("NOT_CONVERSATION_PARTY");
  }
  const ukeCompanyId = conv.company_a === actor.companyId ? conv.company_b : conv.company_a;

  const { data: txRow, error: txError } = await supabase
    .from("transactions")
    .insert({
      conversation_id: conversationId,
      job_id: conv.job_id,
      moto_company: actor.companyId,
      uke_company: ukeCompanyId,
      title: input.title,
      closing_day: input.closingDay ?? null,
      payment_terms: input.paymentTerms,
      status: "active",
    })
    .select("id, created_at")
    .single();
  if (txError || !txRow) return err(txError?.message ?? "CREATE_FAILED");

  const tx = Transaction.create({
    id: txRow.id,
    title: input.title,
    motoCompanyId: actor.companyId,
    ukeCompanyId,
    closingDay: input.closingDay,
    paymentTerms: input.paymentTerms,
    status: "active",
    orders: [],
    orderRequests: [],
    dailyReports: [],
    invoices: [],
    createdAt: txRow.created_at,
    completedAt: null,
  });

  const now = new Date().toISOString();
  const result = tx.addOrder(input, actor, now);
  if (!result.ok) {
    await supabase.from("transactions").delete().eq("id", txRow.id);
    return err(result.error);
  }

  const newOrder = result.value.orders[0];
  const { error: orderError } = await insertOrderRow(supabase, txRow.id, newOrder);
  if (orderError) {
    await supabase.from("transactions").delete().eq("id", txRow.id);
    return err(orderError.message);
  }

  // 段階開放：注文書を送ると取引タブが解放される（相手も注文書を扱うので両社解放する）
  await unlockForBoth(supabase, actor.companyId, ukeCompanyId, "transactions");

  revalidatePath("/transactions");
  return ok({ transactionId: txRow.id });
}

export async function addOrderAction(txId: string, input: AddOrderInput): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const quota = await requireDocumentQuota(supabase, actor.companyId);
  if (!quota.ok) return quota;

  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.addOrder(input, actor, now);
  if (!result.ok) return err(result.error);

  const newOrder = result.value.orders[result.value.orders.length - 1];
  const { data: orderRow, error } = await insertOrderRow(supabase, txId, newOrder);
  if (error) return err(error.message);

  if (input.fulfillsRequestId && orderRow) {
    await supabase
      .from("order_requests")
      .update({ status: "issued", issued_order: orderRow.id })
      .eq("id", input.fulfillsRequestId);
  }

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function acceptOrderAction(txId: string, orderId: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.acceptOrder(orderId, actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await supabase.from("orders").update({ accepted_at: now }).eq("id", orderId);
  if (error) return err(error.message);

  // 段階開放：注文請書を返すと工事写真タブが解放される
  await unlockForBoth(supabase, tx.motoCompanyId, tx.ukeCompanyId, "photos");

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function rejectOrderAction(txId: string, orderId: string, note: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.rejectOrder(orderId, note, actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await supabase
    .from("orders")
    .update({ rejected_at: now, reject_note: note })
    .eq("id", orderId);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function requestAdditionalOrderAction(
  txId: string,
  input: AddOrderRequestInput,
): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.requestAdditionalOrder(input, actor, now);
  if (!result.ok) return err(result.error);

  const newRequest = result.value.orderRequests[result.value.orderRequests.length - 1];
  const { error } = await insertOrderRequestRow(supabase, txId, newRequest);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function addReportAction(txId: string, input: AddReportInput): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.addReport({ ...input, createdBy: actor.userId }, actor, now);
  if (!result.ok) return err(result.error);

  const newReport = result.value.dailyReports[result.value.dailyReports.length - 1];
  const { error } = await insertDailyReportRow(supabase, txId, newReport);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

/** 請求の超過額（注文書の金額を超える場合は警告に使う。拒否はしない）を一緒に返す。 */
export async function submitInvoiceAction(
  txId: string,
  input: SubmitInvoiceInput,
): Promise<Result<{ overAmount: number }>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const quota = await requireDocumentQuota(supabase, actor.companyId);
  if (!quota.ok) return quota;

  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.submitInvoice(input, actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await insertInvoiceRow(supabase, txId, result.value.invoices[result.value.invoices.length - 1]);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok({ overAmount: result.value.overAmount(input.orderId) });
}

export async function approveInvoiceAction(txId: string, invoiceId: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const { data: company } = await supabase
    .from("companies")
    .select("invoice_approval_limit")
    .eq("id", actor.companyId)
    .single();

  const now = new Date().toISOString();
  const result = tx.approveInvoice(invoiceId, actor, now, company?.invoice_approval_limit);
  if (!result.ok) return err(result.error);

  const { error } = await supabase.from("invoices").update({ status: "approved", approved_at: now }).eq("id", invoiceId);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function registerPaymentAction(txId: string, invoiceId: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.registerPayment(invoiceId, actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await supabase.from("invoices").update({ status: "paid", paid_at: now }).eq("id", invoiceId);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

/** 期日内の入金は取引ごとに何度でもカウントされる（確定した遅延の記録はP6の異議申立フローの役目）。 */
export async function confirmReceiptAction(
  txId: string,
  invoiceId: string,
  receivedOn: string,
): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.confirmReceipt(invoiceId, receivedOn, actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await supabase
    .from("invoices")
    .update({ status: "received", received_at: now, received_on: receivedOn })
    .eq("id", invoiceId);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function requestCompletionAction(txId: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.requestCompletion(actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await supabase
    .from("transactions")
    .update({ status: "completion_requested" })
    .eq("id", txId);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

/** 完了承認をトリガーに信用スコアが再計算される（DBトリガー trg_transaction_completed 側の責務）。 */
export async function approveCompletionAction(txId: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.approveCompletion(actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await supabase
    .from("transactions")
    .update({ status: "completed", completed_at: now })
    .eq("id", txId);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}
