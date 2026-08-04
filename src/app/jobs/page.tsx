import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { BottomNav } from "@/components/domain/BottomNav";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadOpenJobs } from "@/lib/supabase/jobRepo";
import { can } from "@/domain/auth/Permission";
import { yen } from "@/domain/shared/money";
import { range, fmt } from "@/domain/shared/date";

const KEISHIKI_LABEL = { ukeoi: "請負", ouen: "応援（常用）" } as const;
const JISU_COLOR = { "1次下請": C.midori, "2次下請": C.usu, "3次下請": C.aka } as const;

export default async function JobsPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const jobs = await loadOpenJobs(supabase);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <Header
        title="案件をさがす"
        right={
          <div className="flex items-center gap-3">
            <Link href="/availabilities" className="text-[12px] font-bold" style={{ color: C.ki }}>
              空き情報
            </Link>
            {can(actor.role, "scout.read") && (
              <Link href="/scouts" className="text-[12px] font-bold" style={{ color: C.ki }}>
                スカウト
              </Link>
            )}
            {can(actor.role, "job.post") && (
              <Link href="/jobs/new" className="text-[13px] font-bold px-2 py-1" style={{ color: C.ki }}>
                + 投稿
              </Link>
            )}
          </div>
        }
      />
      <main className="max-w-md mx-auto p-3 pb-20">
        {jobs.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            今は募集中の案件がありません。
          </p>
        )}
        {jobs.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`}>
            <DenpyoCard tone="plain">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-extrabold truncate" style={{ color: C.sumi }}>
                  {j.name}
                </span>
                {j.companyId === actor.companyId && <Chip color={C.midori}>自社の投稿</Chip>}
              </div>
              <div className="text-[12px] mb-1" style={{ color: C.usu }}>
                {j.companyName}
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Chip solid color={JISU_COLOR[j.jisu]}>
                  {j.jisu}
                </Chip>
                <Chip color={C.usu}>{KEISHIKI_LABEL[j.keishiki]}</Chip>
                <Chip color={C.usu}>{j.industry}</Chip>
                <Chip color={C.usu}>{j.area}</Chip>
                {j.isPublicWork && <Chip color={C.sumi}>公共事業</Chip>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
                  {j.keishiki === "ouen"
                    ? `${yen(j.tanka)}／人工`
                    : j.priceMode === "mitsumori"
                      ? `見積依頼（提出期限 ${fmt(j.quoteDue)}）`
                      : j.price > 0
                        ? yen(j.price)
                        : "応相談"}
                </span>
                {(j.kokiFrom || j.kokiTo) && (
                  <span className="text-[11px]" style={{ color: C.usu }}>
                    {range(j.kokiFrom, j.kokiTo)}
                  </span>
                )}
              </div>
            </DenpyoCard>
          </Link>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
