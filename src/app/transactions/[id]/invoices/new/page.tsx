import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { NewInvoiceForm } from "@/components/domain/NewInvoiceForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTransaction } from "@/lib/supabase/transactionRepo";
import { can } from "@/domain/auth/Permission";
import { isAccepted } from "@/domain/transaction/Order";
import { ninkuByMonth } from "@/domain/transaction/DailyReport";
import { billedForOrder } from "@/domain/transaction/Invoice";

export default async function NewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "invoice.create")) redirect(`/transactions/${id}`);

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, id);
  if (!tx || actor.companyId !== tx.ukeCompanyId) notFound();

  const acceptedOrders = tx.orders.filter(isAccepted).map((o) => ({
    id: o.id,
    seq: o.seq,
    keishiki: o.keishiki,
    amount: o.amount,
    tanka: o.tanka,
    alreadyBilled: billedForOrder(tx.invoices, o.id),
  }));

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="請求書を作る" />
      <main className="max-w-md mx-auto p-3">
        <NewInvoiceForm txId={id} orders={acceptedOrders} monthlyNinku={ninkuByMonth(tx.dailyReports)} />
      </main>
    </div>
  );
}
