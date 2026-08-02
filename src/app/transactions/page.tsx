import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { TxStatusChip } from "@/components/domain/TxStatusChip";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTransactionSummaries } from "@/lib/supabase/transactionRepo";
import { canSeeAmount } from "@/domain/auth/Role";
import { yen } from "@/domain/shared/money";
import { fmt } from "@/domain/shared/date";

export default async function TransactionsPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const summaries = await loadTransactionSummaries(supabase, actor.companyId, actor.role);
  const showAmount = canSeeAmount(actor.role);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <Header title="取引" />
      <main className="max-w-md mx-auto p-3">
        {summaries.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            まだ取引がありません。会話から注文書を送ると、ここに表示されます。
          </p>
        )}
        {summaries.map((t) => (
          <Link key={t.id} href={`/transactions/${t.id}`}>
            <DenpyoCard tone="plain">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-extrabold truncate" style={{ color: C.sumi }}>
                  {t.title}
                </span>
                <span className="flex-1" />
                <TxStatusChip status={t.displayStatus} />
              </div>
              <div className="flex items-center gap-2">
                <Chip color={C.usu}>{t.side === "moto" ? "発注" : "受注"}</Chip>
                <span className="text-[12px]" style={{ color: C.usu }}>
                  {t.partnerCompanyName}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {showAmount && (
                  <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
                    {yen(t.totalAmount)}
                  </span>
                )}
                <span className="text-[11px]" style={{ color: C.usu }}>
                  {fmt(t.createdAt.slice(0, 10))}
                </span>
              </div>
            </DenpyoCard>
          </Link>
        ))}
      </main>
    </div>
  );
}
