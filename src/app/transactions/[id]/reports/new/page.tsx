import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { NewReportForm } from "@/components/domain/NewReportForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTransaction } from "@/lib/supabase/transactionRepo";
import { can } from "@/domain/auth/Permission";

export default async function NewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "report.write")) redirect(`/transactions/${id}`);

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, id);
  if (!tx || actor.companyId !== tx.ukeCompanyId) notFound();

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="日報を書く" />
      <main className="max-w-md mx-auto p-3">
        <NewReportForm txId={id} />
      </main>
    </div>
  );
}
