"use server";

import { randomUUID } from "node:crypto";
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
import { loadLatestDispute, transitionDispute, insertLog } from "@/lib/supabase/disputeRepo";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { notify, companyName } from "@/lib/notifications/notify";
import { yen } from "@/domain/shared/money";
import { fmt } from "@/domain/shared/date";
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

  // transactions の SELECT ポリシー（can_see_transaction → is_tx_party）は自己参照のSELECTで
  // 判定するため、INSERT直後に .select() で行を返そうとする（INSERT ... RETURNING）と、
  // その行がまだ見えず必ずRLS違反になる。IDをアプリ側で先に決めて .select() を使わない。
  const transactionId = randomUUID();
  const now = new Date().toISOString();

  const { error: txError } = await supabase.from("transactions").insert({
    id: transactionId,
    conversation_id: conversationId,
    job_id: conv.job_id,
    moto_company: actor.companyId,
    uke_company: ukeCompanyId,
    title: input.title,
    closing_day: input.closingDay ?? null,
    payment_terms: input.paymentTerms,
    status: "active",
    created_at: now,
  });
  if (txError) return err(txError.message);

  const tx = Transaction.create({
    id: transactionId,
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
    createdAt: now,
    completedAt: null,
  });

  const result = tx.addOrder(input, actor, now);
  if (!result.ok) {
    await supabase.from("transactions").delete().eq("id", transactionId);
    return err(result.error);
  }

  const newOrder = result.value.orders[0];
  const { error: orderError } = await insertOrderRow(supabase, transactionId, newOrder);
  if (orderError) {
    await supabase.from("transactions").delete().eq("id", transactionId);
    return err(orderError.message);
  }

  // 段階開放：注文書を送ると取引タブが解放される（相手も注文書を扱うので両社解放する）
  await unlockForBoth(supabase, actor.companyId, ukeCompanyId, "transactions");

  const motoName = await companyName(supabase, actor.companyId);
  await notify({
    companyId: ukeCompanyId,
    event: "ORD_ISSUED",
    entityType: "transaction",
    entityId: transactionId,
    vars: { partner: motoName, amount: yen(newOrder.keishiki === "ukeoi" ? newOrder.amount : newOrder.tanka) },
    linkPath: `/transactions/${transactionId}`,
  });

  revalidatePath("/transactions");
  return ok({ transactionId });
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

  const motoName = await companyName(supabase, tx.motoCompanyId);
  await notify({
    companyId: tx.ukeCompanyId,
    event: input.fulfillsRequestId ? "ORD_REQ_ISSUED" : "ORD_ADD_ISSUED",
    entityType: "transaction",
    entityId: txId,
    vars: { partner: motoName, n: String(newOrder.seq), amount: yen(newOrder.keishiki === "ukeoi" ? newOrder.amount : newOrder.tanka) },
    linkPath: `/transactions/${txId}`,
  });

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

  const order = result.value.orders.find((o) => o.id === orderId)!;
  const ukeName = await companyName(supabase, tx.ukeCompanyId);
  await notify({
    companyId: tx.motoCompanyId,
    event: "ORD_ACCEPTED",
    entityType: "transaction",
    entityId: txId,
    vars: { partner: ukeName, n: String(order.seq) },
    linkPath: `/transactions/${txId}`,
  });

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

  const order = result.value.orders.find((o) => o.id === orderId)!;
  const ukeName = await companyName(supabase, tx.ukeCompanyId);
  await notify({
    companyId: tx.motoCompanyId,
    event: "ORD_REJECTED",
    entityType: "transaction",
    entityId: txId,
    vars: { partner: ukeName, n: String(order.seq) },
    linkPath: `/transactions/${txId}`,
  });

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

  const ukeName = await companyName(supabase, tx.ukeCompanyId);
  await notify({
    companyId: tx.motoCompanyId,
    event: "ORD_REQ",
    entityType: "transaction",
    entityId: txId,
    vars: { partner: ukeName, content: newRequest.description },
    linkPath: `/transactions/${txId}`,
  });

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

  const newInvoice = result.value.invoices[result.value.invoices.length - 1];
  const { data: invoiceRow, error } = await insertInvoiceRow(supabase, txId, newInvoice);
  if (error) {
    if (error.code === "23505" && error.message.includes("invoices_order_id_target_month_idx")) {
      return err("この注文書・対象月への人工精算請求はすでに提出済みです。対象月を変えるか、他の請求根拠を選んでください。");
    }
    return err(error.message);
  }

  const ukeName = await companyName(supabase, tx.ukeCompanyId);
  await notify({
    companyId: tx.motoCompanyId,
    event: "INV_SUBMITTED",
    entityType: "invoice",
    entityId: invoiceRow.id,
    vars: { partner: ukeName, amount: yen(newInvoice.amount + newInvoice.tax), date: fmt(newInvoice.dueDate) },
    linkPath: `/transactions/${txId}`,
  });

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

  const invoice = result.value.invoices.find((i) => i.id === invoiceId)!;
  await notify({
    companyId: tx.ukeCompanyId,
    event: "INV_APPROVED",
    entityType: "invoice",
    entityId: invoiceId,
    vars: { date: fmt(invoice.dueDate) },
    linkPath: `/transactions/${txId}`,
  });

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function rejectInvoiceAction(txId: string, invoiceId: string, note: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");

  const now = new Date().toISOString();
  const result = tx.rejectInvoice(invoiceId, note, actor, now);
  if (!result.ok) return err(result.error);

  const { error } = await supabase
    .from("invoices")
    .update({ status: "rejected", rejected_at: now, reject_note: note })
    .eq("id", invoiceId);
  if (error) return err(error.message);

  await notify({
    companyId: tx.ukeCompanyId,
    event: "INV_REJECTED",
    entityType: "invoice",
    entityId: invoiceId,
    vars: { reason: note },
    linkPath: `/transactions/${txId}`,
  });

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

  const motoName = await companyName(supabase, tx.motoCompanyId);
  await notify({
    companyId: tx.ukeCompanyId,
    event: "PAY_REGISTERED",
    entityType: "invoice",
    entityId: invoiceId,
    vars: { partner: motoName },
    linkPath: `/transactions/${txId}`,
  });

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

  // 入金確認中のdisputeが残っていれば、実際に入金が確認できた時点で自動的に解決とする。
  const openDispute = await loadLatestDispute(supabase, invoiceId);
  if (openDispute && ["confirming", "date_proposed"].includes(openDispute.status)) {
    await transitionDispute(supabase, openDispute.id, "resolved");
    await insertLog(supabase, openDispute.id, "system", "入金が確認されたため、確認手続きを解決としました。");
  }

  const ukeName = await companyName(supabase, tx.ukeCompanyId);
  await notify({
    companyId: tx.motoCompanyId,
    event: "PAY_CONFIRMED",
    entityType: "invoice",
    entityId: invoiceId,
    vars: { partner: ukeName },
    linkPath: `/transactions/${txId}`,
  });

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

  const ukeName = await companyName(supabase, tx.ukeCompanyId);
  await notify({
    companyId: tx.motoCompanyId,
    event: "CMP_REQUESTED",
    entityType: "transaction",
    entityId: txId,
    vars: { partner: ukeName },
    linkPath: `/transactions/${txId}`,
  });

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

  await notify({
    companyId: tx.ukeCompanyId,
    event: "CMP_APPROVED",
    entityType: "transaction",
    entityId: txId,
    vars: {},
    linkPath: `/transactions/${txId}`,
  });

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}
