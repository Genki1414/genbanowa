import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { currentActor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDisputesByStatus, AdminDisputeListItem } from "@/lib/supabase/adminRepo";
import { yen } from "@/domain/shared/money";
import { fmt } from "@/domain/shared/date";

function DisputeRow({ d, href }: { d: AdminDisputeListItem; href: string }) {
  return (
    <Link href={href}>
      <DenpyoCard tone="plain">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-extrabold truncate" style={{ color: C.sumi }}>
            {d.transactionTitle}
          </span>
        </div>
        <div className="text-[12px] mb-1" style={{ color: C.usu }}>
          発注：{d.motoCompanyName}／受注：{d.ukeCompanyName}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
            {yen(d.amount + d.tax)}
          </span>
          <Chip color={C.usu}>期日 {fmt(d.dueDate)}</Chip>
        </div>
      </DenpyoCard>
    </Link>
  );
}

export default async function AdminDisputesPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!actor.isStaff) redirect("/transactions");

  const admin = createAdminClient();
  const [underReview, inProgress] = await Promise.all([
    loadDisputesByStatus(admin, ["under_review"]),
    loadDisputesByStatus(admin, ["confirming", "date_proposed", "objected"]),
  ]);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <Header title="運営：入金確認・異議申立" />
      <main className="max-w-md mx-auto p-3">
        <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
          事実確認が必要（{underReview.length}件）
        </h2>
        {underReview.length === 0 && (
          <p className="text-[12px] mb-4" style={{ color: C.usu }}>
            現在ありません。
          </p>
        )}
        {underReview.map((d) => (
          <DisputeRow key={d.id} d={d} href={`/admin/disputes/${d.id}`} />
        ))}

        <h2 className="text-[13px] font-extrabold mt-5 mb-2" style={{ color: C.sumi }}>
          当事者間で進行中（{inProgress.length}件）
        </h2>
        <p className="text-[12px] mb-2" style={{ color: C.usu }}>
          まだ運営の判断は不要です。当事者間の手続きが止まっている場合の参考情報です。
        </p>
        {inProgress.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            現在ありません。
          </p>
        )}
        {inProgress.map((d) => (
          <DisputeRow key={d.id} d={d} href={`/admin/disputes/${d.id}`} />
        ))}
      </main>
    </div>
  );
}
