import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { PaymentDispute, DisputeLog, DisputeActor } from "@/domain/transaction/Dispute";

export type Client = SupabaseClient<Database>;

type PaymentDisputeRow = Database["public"]["Tables"]["payment_disputes"]["Row"];
type PaymentDisputeLogRow = Database["public"]["Tables"]["payment_dispute_logs"]["Row"];

function toDispute(row: PaymentDisputeRow): PaymentDispute {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    status: row.status,
    proposedDate: row.proposed_date ?? undefined,
    objection: row.objection ?? undefined,
    decidedBy: row.decided_by ?? undefined,
    decidedAt: row.decided_at ?? undefined,
    decisionNote: row.decision_note ?? undefined,
    createdAt: row.created_at,
  };
}

function toLog(row: PaymentDisputeLogRow): DisputeLog {
  return { id: row.id, disputeId: row.dispute_id, actor: row.actor, text: row.text, createdAt: row.created_at };
}

export async function loadDispute(supabase: Client, disputeId: string): Promise<PaymentDispute | null> {
  const { data } = await supabase.from("payment_disputes").select("*").eq("id", disputeId).maybeSingle();
  return data ? toDispute(data) : null;
}

/** 請求書ごとの最新のdispute（無ければnull）。過去の解決済み分も含めて履歴表示に使う。 */
export async function loadLatestDispute(supabase: Client, invoiceId: string): Promise<PaymentDispute | null> {
  const { data } = await supabase
    .from("payment_disputes")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toDispute(data) : null;
}

/** 複数の請求書ぶんをまとめて取得する（取引詳細画面用）。 */
export async function loadLatestDisputesForInvoices(supabase: Client, invoiceIds: string[]): Promise<Map<string, PaymentDispute>> {
  if (invoiceIds.length === 0) return new Map();
  const { data } = await supabase
    .from("payment_disputes")
    .select("*")
    .in("invoice_id", invoiceIds)
    .order("created_at", { ascending: true });
  const map = new Map<string, PaymentDispute>();
  for (const row of data ?? []) {
    map.set(row.invoice_id, toDispute(row)); // 昇順で入れていくので最後に残るのが最新
  }
  return map;
}

export async function loadLogs(supabase: Client, disputeId: string): Promise<DisputeLog[]> {
  const { data } = await supabase
    .from("payment_dispute_logs")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toLog);
}

export async function insertDispute(supabase: Client, invoiceId: string) {
  return supabase.from("payment_disputes").insert({ invoice_id: invoiceId, status: "confirming" }).select("id").single();
}

export async function insertLog(supabase: Client, disputeId: string, actor: DisputeActor, text: string) {
  return supabase.from("payment_dispute_logs").insert({ dispute_id: disputeId, actor, text });
}

/** 発注者の回答（支払済み・支払予定日の申告・異議）。confirming からの遷移専用。 */
export async function respondDispute(
  supabase: Client,
  disputeId: string,
  status: "confirming" | "date_proposed" | "objected",
  extra?: { proposedDate?: string; objection?: string },
) {
  return supabase
    .from("payment_disputes")
    .update({ status, proposed_date: extra?.proposedDate ?? null, objection: extra?.objection ?? null })
    .eq("id", disputeId);
}

/** ステータスだけを進める（承諾・運営への引き上げ）。proposed_date/objectionは履歴として残すので触らない。 */
export async function transitionDispute(supabase: Client, disputeId: string, status: "resolved" | "under_review") {
  return supabase.from("payment_disputes").update({ status }).eq("id", disputeId);
}
