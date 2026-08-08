import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { currentActor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPendingTrustDocuments, AdminTrustDocumentListItem } from "@/lib/supabase/adminRepo";
import { fmt } from "@/domain/shared/date";

/** 一覧でクリックしなくても内容がわかるようにする簡易プレビュー。ファイル添付は未対応のため、これが唯一の判断材料。 */
function preview(d: AdminTrustDocumentListItem): string | null {
  if (d.kind === "kyoka" && d.values) {
    return String(d.values.license_no ?? "");
  }
  if (d.kind === "hoken" && d.values) {
    const on = Object.entries({ kenpo: "健保", kounen: "厚年", koyou: "雇用", rousai_uwanose: "労災上乗せ" })
      .filter(([k]) => d.values![k])
      .map(([, l]) => l);
    return on.length > 0 ? `加入：${on.join("・")}` : "加入なし";
  }
  if (d.value) return d.value;
  return null;
}

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
        <p className="text-[11px] mb-3" style={{ color: C.usu }}>
          ファイルの添付は今後対応予定です。現状は提出内容の申告のみで判断してください。
        </p>
        {docs.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            現在ありません。
          </p>
        )}
        {docs.map((d) => {
          const p = preview(d);
          return (
            <Link key={d.id} href={`/admin/trust-documents/${d.id}`}>
              <DenpyoCard tone="plain">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-extrabold truncate" style={{ color: C.sumi }}>
                    {d.companyName}
                  </span>
                  <span className="flex-1" />
                  <Chip color={C.usu}>{d.label}</Chip>
                  <Chip color={C.usu}>+{d.points}</Chip>
                </div>
                {p ? (
                  <div className="text-[12px] font-bold truncate" style={{ color: C.sumi }}>
                    {p}
                  </div>
                ) : (
                  <div className="text-[12px]" style={{ color: C.aka }}>
                    申告内容なし（電話等での確認が必要です）
                  </div>
                )}
                <div className="text-[11px] mt-0.5" style={{ color: C.usu }}>
                  提出 {fmt(d.createdAt)}
                </div>
              </DenpyoCard>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
