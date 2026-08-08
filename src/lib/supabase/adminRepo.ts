import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { DisputeStatus } from "@/domain/transaction/Dispute";
import { notifyBoth } from "@/lib/notifications/notify";

export type AdminClient = SupabaseClient<Database>;

export interface AdminDisputeListItem {
  id: string;
  status: DisputeStatus;
  invoiceId: string;
  transactionId: string;
  transactionTitle: string;
  motoCompanyId: string;
  motoCompanyName: string;
  ukeCompanyId: string;
  ukeCompanyName: string;
  amount: number;
  tax: number;
  dueDate: string;
  createdAt: string;
}

/**
 * 運営画面用。会社をまたいで横断的に読むため service role クライアント（RLSをバイパス）を使う。
 * 呼び出し側で actor.isStaff を必ず確認してから呼ぶこと（このファイル自体は権限チェックをしない）。
 */
export async function loadDisputesByStatus(admin: AdminClient, statuses: DisputeStatus[]): Promise<AdminDisputeListItem[]> {
  const { data: disputes } = await admin
    .from("payment_disputes")
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: true });
  if (!disputes || disputes.length === 0) return [];

  const invoiceIds = [...new Set(disputes.map((d) => d.invoice_id))];
  const { data: invoices } = await admin.from("invoices").select("*").in("id", invoiceIds);
  const invoiceById = new Map((invoices ?? []).map((i) => [i.id, i]));

  const txIds = [...new Set((invoices ?? []).map((i) => i.transaction_id))];
  const { data: txs } = await admin.from("transactions").select("*").in("id", txIds);
  const txById = new Map((txs ?? []).map((t) => [t.id, t]));

  const companyIds = [...new Set((txs ?? []).flatMap((t) => [t.moto_company, t.uke_company]))];
  const { data: companies } = await admin.from("companies").select("id, name").in("id", companyIds);
  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return disputes
    .map((d) => {
      const invoice = invoiceById.get(d.invoice_id);
      if (!invoice) return null;
      const tx = txById.get(invoice.transaction_id);
      if (!tx) return null;
      return {
        id: d.id,
        status: d.status,
        invoiceId: invoice.id,
        transactionId: tx.id,
        transactionTitle: tx.title,
        motoCompanyId: tx.moto_company,
        motoCompanyName: companyNameById.get(tx.moto_company) ?? "—",
        ukeCompanyId: tx.uke_company,
        ukeCompanyName: companyNameById.get(tx.uke_company) ?? "—",
        amount: invoice.amount,
        tax: invoice.tax,
        dueDate: invoice.due_date,
        createdAt: d.created_at,
      };
    })
    .filter((x): x is AdminDisputeListItem => x !== null);
}

export interface AdminDisputeDetail extends AdminDisputeListItem {
  proposedDate?: string;
  objection?: string;
  decisionNote?: string;
  decidedAt?: string;
  logs: { id: string; actor: string; text: string; createdAt: string }[];
}

export async function loadDisputeDetail(admin: AdminClient, disputeId: string): Promise<AdminDisputeDetail | null> {
  const { data: dispute } = await admin.from("payment_disputes").select("*").eq("id", disputeId).maybeSingle();
  if (!dispute) return null;

  const { data: invoice } = await admin.from("invoices").select("*").eq("id", dispute.invoice_id).maybeSingle();
  if (!invoice) return null;
  const { data: tx } = await admin.from("transactions").select("*").eq("id", invoice.transaction_id).maybeSingle();
  if (!tx) return null;
  const { data: companies } = await admin.from("companies").select("id, name").in("id", [tx.moto_company, tx.uke_company]);
  const nameById = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const { data: logRows } = await admin
    .from("payment_dispute_logs")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });

  return {
    id: dispute.id,
    status: dispute.status,
    invoiceId: invoice.id,
    transactionId: tx.id,
    transactionTitle: tx.title,
    motoCompanyId: tx.moto_company,
    motoCompanyName: nameById.get(tx.moto_company) ?? "—",
    ukeCompanyId: tx.uke_company,
    ukeCompanyName: nameById.get(tx.uke_company) ?? "—",
    amount: invoice.amount,
    tax: invoice.tax,
    dueDate: invoice.due_date,
    createdAt: dispute.created_at,
    proposedDate: dispute.proposed_date ?? undefined,
    objection: dispute.objection ?? undefined,
    decisionNote: dispute.decision_note ?? undefined,
    decidedAt: dispute.decided_at ?? undefined,
    logs: (logRows ?? []).map((l) => ({ id: l.id, actor: l.actor, text: l.text, createdAt: l.created_at })),
  };
}

export async function decideDispute(
  admin: AdminClient,
  disputeId: string,
  decision: "recorded" | "resolved",
  note: string | undefined,
  decidedBy: string,
) {
  const { error } = await admin.rpc("record_payment_delay", {
    p_dispute_id: disputeId,
    p_decision: decision,
    p_note: note ?? null,
    p_decided_by: decidedBy,
  });
  if (error) return { error };
  await admin.from("payment_dispute_logs").insert({
    dispute_id: disputeId,
    actor: "admin",
    text: decision === "recorded" ? "運営が遅延として記録しました。" : "運営が確認の結果、遅延ではないと判断しました。",
  });

  // 双方に必ず通知する（docs/03_規約・信用情報方針ドラフト.md 4-4章「記録は双方に通知します」）。
  const { data: dispute } = await admin.from("payment_disputes").select("invoice_id").eq("id", disputeId).maybeSingle();
  if (dispute) {
    const { data: invoice } = await admin.from("invoices").select("transaction_id").eq("id", dispute.invoice_id).maybeSingle();
    if (invoice) {
      const { data: tx } = await admin.from("transactions").select("moto_company, uke_company").eq("id", invoice.transaction_id).maybeSingle();
      if (tx) {
        await notifyBoth({
          companyIdA: tx.moto_company,
          companyIdB: tx.uke_company,
          event: decision === "recorded" ? "DSP_RECORDED" : "DSP_RESOLVED",
          entityType: "dispute",
          entityId: disputeId,
          vars: {},
          linkPath: `/transactions/${invoice.transaction_id}`,
        });
      }
    }
  }

  return { error: null };
}
