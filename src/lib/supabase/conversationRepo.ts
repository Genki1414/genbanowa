import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { Message, unreadCount } from "@/domain/conversation/Conversation";
import { Result, ok, err } from "@/domain/shared/result";

export type Client = SupabaseClient<Database>;

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderCompanyId: row.sender_company,
    senderUserId: row.sender_user ?? undefined,
    body: row.body ?? undefined,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export interface ConversationListItem {
  id: string;
  kind: "job" | "direct";
  jobId: string | null;
  partnerCompanyId: string;
  partnerCompanyName: string;
  lastAt: string;
  lastMessagePreview: string;
  unread: number;
}

/** 自社が当事者の会話を、最終更新順に一覧化する。RLSが自社の会話だけを返す前提。 */
export async function loadConversationList(supabase: Client, myCompanyId: string): Promise<ConversationListItem[]> {
  const { data: convRows } = await supabase
    .from("conversations")
    .select("*")
    .or(`company_a.eq.${myCompanyId},company_b.eq.${myCompanyId}`)
    .order("last_at", { ascending: false });
  if (!convRows || convRows.length === 0) return [];

  const ids = convRows.map((c) => c.id);
  const { data: msgRows } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  const partnerIds = [...new Set(convRows.map((c) => (c.company_a === myCompanyId ? c.company_b : c.company_a)))];
  // companies は自社しか見えないRLSなので、相手会社の名前は意図的に公開しているビューから引く
  const { data: partnerRows } = await supabase.from("companies_public").select("id, name").in("id", partnerIds);
  const nameById = new Map((partnerRows ?? []).map((c) => [c.id, c.name]));

  const messagesByConv = new Map<string, MessageRow[]>();
  for (const m of msgRows ?? []) {
    messagesByConv.set(m.conversation_id, [...(messagesByConv.get(m.conversation_id) ?? []), m]);
  }

  return convRows.map((c) => {
    const rows = messagesByConv.get(c.id) ?? [];
    const last = rows[rows.length - 1];
    const partnerCompanyId = c.company_a === myCompanyId ? c.company_b : c.company_a;
    return {
      id: c.id,
      kind: c.kind,
      jobId: c.job_id,
      partnerCompanyId,
      partnerCompanyName: nameById.get(partnerCompanyId) ?? "—",
      lastAt: c.last_at,
      lastMessagePreview: last ? (last.body ?? (last.attachment ? "添付ファイル" : "")) : "",
      unread: unreadCount(rows.map(toMessage), myCompanyId),
    };
  });
}

export async function loadConversation(supabase: Client, id: string): Promise<ConversationRow | null> {
  const { data } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function loadMessages(supabase: Client, conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toMessage);
}

/** 同じ相手×同じ案件（direct なら job_id は null）の既存スレッドを探す。重複防止はDBのunique制約が最終防壁。 */
export async function findExistingConversation(
  supabase: Client,
  kind: "job" | "direct",
  companyA: string,
  companyB: string,
  jobId: string | null,
): Promise<{ id: string } | null> {
  let query = supabase
    .from("conversations")
    .select("id")
    .eq("kind", kind)
    .or(`and(company_a.eq.${companyA},company_b.eq.${companyB}),and(company_a.eq.${companyB},company_b.eq.${companyA})`);
  query = jobId ? query.eq("job_id", jobId) : query.is("job_id", null);
  const { data } = await query.maybeSingle();
  return data ?? null;
}

/** その月に新規開始した会話数。やり取り枠（plan.send）の判定に使う。 */
export async function conversationsStartedThisMonth(supabase: Client, companyId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .or(`company_a.eq.${companyId},company_b.eq.${companyId}`)
    .gte("created_at", monthStart);
  return count ?? 0;
}

export async function insertMessage(
  supabase: Client,
  conversationId: string,
  senderCompanyId: string,
  senderUserId: string,
  body: string,
): Promise<Result<null>> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_company: senderCompanyId,
    sender_user: senderUserId,
    body,
  });
  if (error) return err(error.message);

  await supabase.from("conversations").update({ last_at: new Date().toISOString() }).eq("id", conversationId);
  return ok(null);
}
