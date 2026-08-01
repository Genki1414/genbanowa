import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { NewOrderForm } from "@/components/domain/NewOrderForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTransaction } from "@/lib/supabase/transactionRepo";
import { can } from "@/domain/auth/Permission";

export default async function NewOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fulfillsRequestId?: string; description?: string; estAmount?: string }>;
}) {
  const { id } = await params;
  const { fulfillsRequestId, description, estAmount } = await searchParams;
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "order.issue")) redirect(`/transactions/${id}`);

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, id);
  if (!tx || actor.companyId !== tx.motoCompanyId) notFound();

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="注文書を送る" />
      <main className="max-w-md mx-auto p-3">
        <NewOrderForm
          txId={id}
          defaultPaymentTerms={tx.orders[0]?.paymentTerms}
          fulfillsRequestId={fulfillsRequestId}
          initialNote={description}
          initialAmount={estAmount && estAmount !== "0" ? estAmount : undefined}
        />
      </main>
    </div>
  );
}
