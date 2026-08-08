import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { currentActor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPendingTrustDocuments } from "@/lib/supabase/adminRepo";
import { fmt } from "@/domain/shared/date";

export default async function AdminTrustDocumentsPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!actor.isStaff) redirect("/transactions");

  const admin = createAdminClient();
  const docs = await loadPendingTrustDocuments(admin);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <Header title="運営：信用書類の確認" />
      <main className="max-w-md mx-auto p-3">
        <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
          確認待ち（{docs.length}件）
        </h2>
        {docs.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            現在ありません。
          </p>
        )}
        {docs.map((d) => (
          <Link key={d.id} href={`/admin/trust-documents/${d.id}`}>
            <DenpyoCard tone="plain">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-extrabold truncate" style={{ color: C.sumi }}>
                  {d.companyName}
                </span>
                <span className="flex-1" />
                <Chip color={C.usu}>+{d.points}</Chip>
              </div>
              <div className="text-[12px]" style={{ color: C.usu }}>
                {d.label}／提出 {fmt(d.createdAt)}
              </div>
            </DenpyoCard>
          </Link>
        ))}
      </main>
    </div>
  );
}
