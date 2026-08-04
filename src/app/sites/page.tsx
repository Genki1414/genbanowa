import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHat, Folder, ChevronRight, Plus } from "lucide-react";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Btn } from "@/components/ui/Btn";
import { ArchiveSiteButton } from "@/components/domain/ArchiveSiteButton";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMySites } from "@/lib/supabase/siteRepo";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { can } from "@/domain/auth/Permission";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { lim } from "@/domain/plan/Plan";

export default async function SitesPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const [sites, plan] = await Promise.all([loadMySites(supabase, actor.companyId), getCompanyPlan(supabase, actor.companyId)]);
  const canCreate = can(actor.role, "site.create");
  const canDelete = can(actor.role, "site.delete");
  const quota = checkQuota(plan, { ...emptyUsage(), activeSiteCount: sites.length }, "site.slot");

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <Header title="工事写真" />
      <main className="max-w-md mx-auto p-3">
        <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <p className="text-[12px]" style={{ color: C.usu }}>
            撮影と黒板は無料で使えます。民間工事向けで、公共工事の電子納品には未対応です。
          </p>
        </div>

        {sites.length === 0 ? (
          <div className="py-10 text-center">
            <HardHat size={40} style={{ color: C.keisen, margin: "0 auto 12px" }} />
            <p className="text-[14px] font-bold mb-1" style={{ color: C.sumi }}>
              現場がまだありません
            </p>
            <p className="text-[12px] mb-5" style={{ color: C.usu }}>
              先に現場をつくると、写真がその中に整理されます。
            </p>
            {canCreate && (
              <Link href="/sites/new">
                <Btn tone="ki">現場をつくる</Btn>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-[13px] font-extrabold" style={{ color: C.sumi }}>
                現場フォルダ
              </h2>
              <span className="text-[12px]" style={{ color: C.usu }}>
                {sites.length}／{lim(plan.site)}
              </span>
            </div>
            {sites.map((s) => (
              <DenpyoCard key={s.id} tone="ki">
                <div className="flex items-center gap-2">
                  <Link href={`/sites/${s.id}`} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <Folder size={18} style={{ color: C.sumi, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div className="text-[15px] font-extrabold truncate" style={{ color: C.sumi }}>
                        {s.name}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: C.usu }}>
                        {s.address || "住所なし"}・{s.photoCount}枚
                      </div>
                    </div>
                  </Link>
                  {canDelete && <ArchiveSiteButton id={s.id} />}
                  <ChevronRight size={17} style={{ color: C.usu }} />
                </div>
              </DenpyoCard>
            ))}
            {canCreate &&
              (quota.ok ? (
                <Link href="/sites/new" className="block w-full">
                  <div
                    className="w-full py-2.5 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                    style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}
                  >
                    <Plus size={15} />
                    現場を追加する
                  </div>
                </Link>
              ) : (
                <div className="p-3 rounded-sm" style={{ background: C.ki }}>
                  <p className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                    同時に持てる現場は{lim(plan.site)}件までです
                  </p>
                  <p className="text-[12px]" style={{ color: C.sumi }}>
                    終わった現場を削除すれば新しく作れます。上位プランなら上限が広がります。
                  </p>
                </div>
              ))}
          </>
        )}
      </main>
    </div>
  );
}
