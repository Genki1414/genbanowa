"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { loadTransaction } from "@/lib/supabase/transactionRepo";
import { loadDispute, loadLatestDispute, insertDispute, insertLog, respondDispute, transitionDispute } from "@/lib/supabase/disputeRepo";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { canRequestConfirmation, canRespond, canAcceptProposedDate, canEscalate } from "@/domain/transaction/Dispute";
import { fmt } from "@/domain/shared/date";

const today = () => new Date().toISOString().slice(0, 10);

/** 「入金の確認を依頼する」。docs/03_規約・信用情報方針ドラフト.md 4-4章の①②に対応。 */
export async function requestConfirmationAction(txId: string, invoiceId: string): Promise<Result<{ disputeId: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "dispute.request")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");
  if (tx.ukeCompanyId !== actor.companyId) return err("NOT_UKE");

  const invoice = tx.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return err("INVOICE_NOT_FOUND");

  const existing = await loadLatestDispute(supabase, invoiceId);
  if (!canRequestConfirmation(invoice.status, invoice.dueDate, today(), existing)) return err("CANNOT_REQUEST");

  const { data, error } = await insertDispute(supabase, invoiceId);
  if (error) return err(error.message);

  await insertLog(supabase, data.id, "uke", "受注者が入金の確認を依頼しました。");
  revalidatePath(`/transactions/${txId}`);
  return ok({ disputeId: data.id });
}

/** 発注者の回答（支払済み／支払予定日の申告／異議）。同章の③。 */
export async function respondDisputeAction(
  txId: string,
  disputeId: string,
  kind: "paid" | "date" | "objection",
  payload: { proposedDate?: string; objection?: string },
): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "dispute.object")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");
  if (tx.motoCompanyId !== actor.companyId) return err("NOT_MOTO");

  const dispute = await loadDispute(supabase, disputeId);
  if (!dispute || !tx.invoices.some((i) => i.id === dispute.invoiceId)) return err("DISPUTE_NOT_FOUND");
  if (!canRespond(dispute)) return err("CANNOT_RESPOND");

  if (kind === "date") {
    if (!payload.proposedDate) return err("PROPOSED_DATE_REQUIRED");
    const { error } = await respondDispute(supabase, disputeId, "date_proposed", { proposedDate: payload.proposedDate });
    if (error) return err(error.message);
    await insertLog(supabase, disputeId, "moto", `発注者が支払予定日（${fmt(payload.proposedDate)}）を申告しました。`);
  } else if (kind === "objection") {
    if (!payload.objection?.trim()) return err("OBJECTION_REQUIRED");
    const { error } = await respondDispute(supabase, disputeId, "objected", { objection: payload.objection });
    if (error) return err(error.message);
    await insertLog(supabase, disputeId, "moto", `発注者から異議が出されました：${payload.objection}`);
  } else {
    const { error } = await respondDispute(supabase, disputeId, "confirming");
    if (error) return err(error.message);
    await insertLog(supabase, disputeId, "moto", "発注者が「支払済みです」と回答しました。入金確認をお待ちください。");
  }

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

/** 受注者が、発注者の申告した支払予定日を承諾する。承諾した期日までは記録されない。 */
export async function acceptProposedDateAction(txId: string, disputeId: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "dispute.request")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");
  if (tx.ukeCompanyId !== actor.companyId) return err("NOT_UKE");

  const dispute = await loadDispute(supabase, disputeId);
  if (!dispute || !tx.invoices.some((i) => i.id === dispute.invoiceId)) return err("DISPUTE_NOT_FOUND");
  if (!canAcceptProposedDate(dispute)) return err("CANNOT_ACCEPT");

  const { error } = await transitionDispute(supabase, disputeId, "resolved");
  if (error) return err(error.message);
  await insertLog(supabase, disputeId, "uke", `受注者が支払予定日（${fmt(dispute.proposedDate)}）を承諾しました。`);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

/** 運営の事実確認に引き上げる。不承諾・異議・回答なしのいずれもここを通る。 */
export async function escalateDisputeAction(txId: string, disputeId: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "dispute.request")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, txId);
  if (!tx) return err("TRANSACTION_NOT_FOUND");
  if (tx.ukeCompanyId !== actor.companyId) return err("NOT_UKE");

  const dispute = await loadDispute(supabase, disputeId);
  if (!dispute || !tx.invoices.some((i) => i.id === dispute.invoiceId)) return err("DISPUTE_NOT_FOUND");
  if (!canEscalate(dispute)) return err("CANNOT_ESCALATE");

  const { error } = await transitionDispute(supabase, disputeId, "under_review");
  if (error) return err(error.message);
  await insertLog(supabase, disputeId, "uke", "受注者が運営に事実確認を依頼しました。");

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}
