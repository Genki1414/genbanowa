"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { findExistingConversation, conversationsStartedThisMonth, insertMessage } from "@/lib/supabase/conversationRepo";

export async function searchCompaniesAction(query: string): Promise<Result<{ id: string; name: string }[]>> {
  const actor = await requireActor();
  const q = query.trim();
  if (!q) return ok([]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .neq("id", actor.companyId)
    .ilike("name", `%${q}%`)
    .limit(20);
  if (error) return err(error.message);
  return ok(data ?? []);
}

/**
 * 会話は相手×案件の組で1本のみ（重複防止はDBのunique制約が最終防壁）。既存があれば再利用し、
 * やり取り枠は消費しない。新規のときだけ checkQuota() で確認する
 * （CLAUDE.md「絶対に守ること」7：判定は checkQuota() と can() に集約する）。
 */
export async function startConversationAction(
  targetCompanyId: string,
  firstMessage: string,
): Promise<Result<{ conversationId: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "message.send")) return err("PERMISSION_DENIED");
  if (targetCompanyId === actor.companyId) return err("CANNOT_MESSAGE_SELF");
  if (!firstMessage.trim()) return err("EMPTY_MESSAGE");

  const supabase = await createClient();
  const kind = "direct" as const;

  const existing = await findExistingConversation(supabase, kind, actor.companyId, targetCompanyId, null);
  if (existing) {
    const r = await insertMessage(supabase, existing.id, actor.companyId, actor.userId, firstMessage);
    if (!r.ok) return err(r.error);
    revalidatePath("/messages");
    revalidatePath(`/messages/${existing.id}`);
    return ok({ conversationId: existing.id });
  }

  const plan = await getCompanyPlan(supabase, actor.companyId);
  const started = await conversationsStartedThisMonth(supabase, actor.companyId);
  const quota = checkQuota(plan, { ...emptyUsage(), conversationsStartedThisMonth: started }, "conversation.start");
  if (!quota.ok) return err(quota.reason);

  const { data: convRow, error } = await supabase
    .from("conversations")
    .insert({ kind, job_id: null, company_a: actor.companyId, company_b: targetCompanyId })
    .select("id")
    .single();
  if (error) return err(error.message);

  const r = await insertMessage(supabase, convRow.id, actor.companyId, actor.userId, firstMessage);
  if (!r.ok) return err(r.error);

  revalidatePath("/messages");
  return ok({ conversationId: convRow.id });
}

export async function sendMessageAction(conversationId: string, body: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "message.send")) return err("PERMISSION_DENIED");
  if (!body.trim()) return err("EMPTY_MESSAGE");

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("company_a, company_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return err("CONVERSATION_NOT_FOUND");
  if (conv.company_a !== actor.companyId && conv.company_b !== actor.companyId) return err("NOT_CONVERSATION_PARTY");

  const r = await insertMessage(supabase, conversationId, actor.companyId, actor.userId, body);
  if (!r.ok) return err(r.error);

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return ok(null);
}

export async function markReadAction(conversationId: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_company", actor.companyId)
    .is("read_at", null);
  if (error) return err(error.message);
  revalidatePath("/messages");
  return ok(null);
}
