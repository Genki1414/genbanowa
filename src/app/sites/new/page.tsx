import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { SiteCreateForm } from "@/components/domain/SiteCreateForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadSiteCandidates } from "@/lib/supabase/siteRepo";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { can } from "@/domain/auth/Permission";
import { lim } from "@/domain/plan/Plan";

export default async function NewSitePage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "site.create")) redirect("/sites");

  const supabase = await createClient();
  const [candidates, plan] = await Promise.all([loadSiteCandidates(supabase, actor.companyId), getCompanyPlan(supabase, actor.companyId)]);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="現場をつくる" />
      <main className="max-w-md mx-auto p-3">
        <div className="p-2 mb-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <p className="text-[12px]" style={{ color: C.usu }}>
            現場フォルダは同時に{lim(plan.site)}件まで作れます。終わった現場を削除すると、新しい現場を作れます。
          </p>
        </div>
        <SiteCreateForm candidates={candidates} />
      </main>
    </div>
  );
}
