import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TrustDocKind } from "./database.types";
import { DisputeStatus } from "@/domain/transaction/Dispute";
import { notify, notifyBoth } from "@/lib/notifications/notify";

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

export interface AdminTrustDocumentListItem {
  id: string;
  kind: TrustDocKind;
  label: string;
  points: number;
  companyId: string;
  companyName: string;
  createdAt: string;
}

export async function loadPendingTrustDocuments(admin: AdminClient): Promise<AdminTrustDocumentListItem[]> {
  const { data: docs } = await admin
    .from("trust_documents")
    .select("id, kind, company_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (!docs || docs.length === 0) return [];

  const [{ data: points }, { data: companies }] = await Promise.all([
    admin.from("trust_doc_points").select("*"),
    admin.from("companies").select("id, name").in("id", [...new Set(docs.map((d) => d.company_id))]),
  ]);
  const pointByKind = new Map((points ?? []).map((p) => [p.kind, p]));
  const nameById = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return docs.map((d) => {
    const p = pointByKind.get(d.kind);
    return {
      id: d.id,
      kind: d.kind,
      label: p?.label ?? d.kind,
      points: p?.points ?? 0,
      companyId: d.company_id,
      companyName: nameById.get(d.company_id) ?? "—",
      createdAt: d.created_at,
    };
  });
}

export interface AdminTrustDocumentDetail extends AdminTrustDocumentListItem {
  status: "pending" | "approved" | "rejected";
  value: string | null;
  values: Record<string, unknown> | null;
}

export async function loadTrustDocumentDetail(admin: AdminClient, docId: string): Promise<AdminTrustDocumentDetail | null> {
  const { data: doc } = await admin.from("trust_documents").select("*").eq("id", docId).maybeSingle();
  if (!doc) return null;
  const [{ data: point }, { data: company }] = await Promise.all([
    admin.from("trust_doc_points").select("*").eq("kind", doc.kind).maybeSingle(),
    admin.from("companies").select("id, name").eq("id", doc.company_id).maybeSingle(),
  ]);
  return {
    id: doc.id,
    kind: doc.kind,
    label: point?.label ?? doc.kind,
    points: point?.points ?? 0,
    companyId: doc.company_id,
    companyName: company?.name ?? "—",
    createdAt: doc.created_at,
    status: doc.status,
    value: doc.value,
    values: (doc.values as Record<string, unknown> | null) ?? null,
  };
}

/**
 * 承認。companiesへの反映と信用スコア再計算はDB側のapprove_trust_document()（0019）が行う。
 * ここでは承認前後のtrust_levelを見て、TRT_APPROVEDと（レベルが上がった場合のみ）TRT_LEVEL_UPを通知する。
 */
export async function approveTrustDocument(admin: AdminClient, docId: string, reviewedBy: string) {
  const { data: doc } = await admin.from("trust_documents").select("kind, company_id").eq("id", docId).maybeSingle();
  if (!doc) return { error: { message: "書類が見つかりません" } };

  const [{ data: point }, { data: before }] = await Promise.all([
    admin.from("trust_doc_points").select("label").eq("kind", doc.kind).maybeSingle(),
    admin.from("companies").select("trust_level").eq("id", doc.company_id).maybeSingle(),
  ]);

  const { error } = await admin.rpc("approve_trust_document", { p_doc_id: docId, p_reviewed_by: reviewedBy });
  if (error) return { error };

  const { data: after } = await admin.from("companies").select("trust_score, trust_level").eq("id", doc.company_id).maybeSingle();

  await notify({
    companyId: doc.company_id,
    event: "TRT_APPROVED",
    entityType: "trust_document",
    entityId: docId,
    vars: { docLabel: point?.label ?? doc.kind, score: String(after?.trust_score ?? "") },
    linkPath: `/companies/${doc.company_id}`,
  });

  if (after && before && after.trust_level !== before.trust_level) {
    await notify({
      companyId: doc.company_id,
      event: "TRT_LEVEL_UP",
      entityType: "trust_document",
      entityId: docId,
      vars: { level: after.trust_level },
      linkPath: `/companies/${doc.company_id}`,
    });
  }

  return { error: null };
}

export async function rejectTrustDocument(admin: AdminClient, docId: string, reviewedBy: string, note: string | undefined) {
  const { data: doc } = await admin.from("trust_documents").select("kind, company_id").eq("id", docId).maybeSingle();
  if (!doc) return { error: { message: "書類が見つかりません" } };

  const { data: point } = await admin.from("trust_doc_points").select("label").eq("kind", doc.kind).maybeSingle();

  const { error } = await admin.rpc("reject_trust_document", { p_doc_id: docId, p_reviewed_by: reviewedBy, p_note: note ?? null });
  if (error) return { error };

  await notify({
    companyId: doc.company_id,
    event: "TRT_REJECTED",
    entityType: "trust_document",
    entityId: docId,
    vars: { docLabel: point?.label ?? doc.kind, reason: note ?? "特になし" },
    linkPath: `/companies/${doc.company_id}`,
  });

  return { error: null };
}
