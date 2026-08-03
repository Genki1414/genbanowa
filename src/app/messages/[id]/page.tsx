import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { MessageThread } from "@/components/domain/MessageThread";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadConversation, loadMessages } from "@/lib/supabase/conversationRepo";
import { can } from "@/domain/auth/Permission";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const conv = await loadConversation(supabase, id);
  if (!conv) notFound();
  if (conv.company_a !== actor.companyId && conv.company_b !== actor.companyId) notFound();

  const partnerCompanyId = conv.company_a === actor.companyId ? conv.company_b : conv.company_a;
  const [{ data: partner }, messages, { data: existingTx }] = await Promise.all([
    supabase.from("companies_public").select("name").eq("id", partnerCompanyId).maybeSingle(),
    loadMessages(supabase, id),
    supabase.from("transactions").select("id").eq("conversation_id", id).maybeSingle(),
  ]);

  const canSend = can(actor.role, "message.send");
  const canRequestTransaction = can(actor.role, "transaction.request") && !existingTx;
  const hasUnread = messages.some((m) => m.senderCompanyId !== actor.companyId && m.readAt === null);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.yojo }}>
      <BackHeader
        title={partner?.name ?? "—"}
        right={
          existingTx ? (
            <Link href={`/transactions/${existingTx.id}`} className="text-[12px] font-bold px-2 py-1" style={{ color: C.ki }}>
              取引を見る
            </Link>
          ) : undefined
        }
      />
      <MessageThread
        conversationId={id}
        messages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          mine: m.senderCompanyId === actor.companyId,
        }))}
        canSend={canSend}
        canRequestTransaction={canRequestTransaction}
        hasUnread={hasUnread}
      />
    </div>
  );
}
