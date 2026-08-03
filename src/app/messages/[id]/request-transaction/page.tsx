import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { NewTransactionForm } from "@/components/domain/NewTransactionForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadConversation } from "@/lib/supabase/conversationRepo";
import { can } from "@/domain/auth/Permission";

export default async function RequestTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "transaction.request")) redirect(`/messages/${id}`);

  const supabase = await createClient();
  const conv = await loadConversation(supabase, id);
  if (!conv) notFound();
  if (conv.company_a !== actor.companyId && conv.company_b !== actor.companyId) notFound();

  const partnerCompanyId = conv.company_a === actor.companyId ? conv.company_b : conv.company_a;
  const { data: partner } = await supabase.from("companies").select("name").eq("id", partnerCompanyId).maybeSingle();

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="取引を依頼する" />
      <main className="max-w-md mx-auto p-3">
        <NewTransactionForm conversationId={id} partnerName={partner?.name ?? "—"} />
      </main>
    </div>
  );
}
