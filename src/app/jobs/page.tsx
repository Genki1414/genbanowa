import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { MineSection } from "@/components/domain/MineSection";
import { JobFilterBar } from "@/components/domain/JobFilterBar";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadOpenJobs, loadMyJobs } from "@/lib/supabase/jobRepo";
import { JobListItem } from "@/lib/supabase/jobRepo";
import { can } from "@/domain/auth/Permission";
import { yen } from "@/domain/shared/money";
import { range, fmt } from "@/domain/shared/date";

const KEISHIKI_LABEL = { ukeoi: "請負", ouen: "応援（常用）" } as const;
const JISU_COLOR = { "1次下請": C.midori, "2次下請": C.usu, "3次下請": C.aka } as const;

function JobCard({ job, mine }: { job: JobListItem; mine: boolean }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <DenpyoCard tone={mine ? "midori" : "plain"}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-extrabold truncate" style={{ color: C.sumi }}>
            {job.name}
          </span>
        </div>
        <div className="text-[12px] mb-1" style={{ color: C.usu }}>
          {job.companyName}
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Chip solid color={JISU_COLOR[job.jisu]}>
            {job.jisu}
          </Chip>
          <Chip color={C.usu}>{KEISHIKI_LABEL[job.keishiki]}</Chip>
          <Chip color={C.usu}>{job.industry}</Chip>
          <Chip color={C.usu}>{job.area}</Chip>
          {job.isPublicWork && <Chip color={C.sumi}>公共事業</Chip>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
            {job.keishiki === "ouen"
              ? `${yen(job.tanka)}／人工`
              : job.priceMode === "mitsumori"
                ? `見積依頼（提出期限 ${fmt(job.quoteDue)}）`
                : job.price > 0
                  ? yen(job.price)
                  : "応相談"}
          </span>
          {(job.kokiFrom || job.kokiTo) && (
            <span className="text-[11px]" style={{ color: C.usu }}>
              {range(job.kokiFrom, job.kokiTo)}
            </span>
          )}
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: C.usu }}>
          投稿 {fmt(job.postedAt)}
        </div>
      </DenpyoCard>
    </Link>
  );
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; industry?: string; keishiki?: string; jisu?: string }>;
}) {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const { q = "", area = "すべて", industry = "すべて", keishiki = "すべて", jisu = "すべて" } = await searchParams;

  const supabase = await createClient();
  const [openJobs, myJobs] = await Promise.all([loadOpenJobs(supabase), loadMyJobs(supabase, actor.companyId)]);

  const areas = ["すべて", ...Array.from(new Set(openJobs.map((j) => j.area.slice(0, 3))))];
  const industries = ["すべて", ...Array.from(new Set(openJobs.map((j) => j.industry)))];

  const hasFilter = !!q || area !== "すべて" || industry !== "すべて" || keishiki !== "すべて" || jisu !== "すべて";

  const otherJobs = openJobs
    .filter((j) => j.companyId !== actor.companyId)
    .filter(
      (j) =>
        (area === "すべて" || j.area.startsWith(area)) &&
        (industry === "すべて" || j.industry === industry) &&
        (keishiki === "すべて" || KEISHIKI_LABEL[j.keishiki] === keishiki) &&
        (jisu === "すべて" || j.jisu === jisu) &&
        (!q || (j.name + j.companyName + j.area + j.industry).includes(q)),
    );

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
      <main className="max-w-md mx-auto p-3">
        <JobFilterBar areas={areas} industries={industries} initial={{ q, area, industry, keishiki, jisu }} />

        <MineSection label="自社の投稿" count={myJobs.length}>
          {myJobs.map((j) => (
            <JobCard key={j.id} job={j} mine />
          ))}
        </MineSection>

        {otherJobs.length === 0 && (
          <p className="text-[12px] py-6 text-center" style={{ color: C.usu }}>
            {hasFilter ? "条件に合う案件がありません。絞り込みを変えてみてください。" : "今は募集中の案件がありません。"}
          </p>
        )}
        {otherJobs.map((j) => (
          <JobCard key={j.id} job={j} mine={false} />
        ))}
      </main>
    </div>
  );
}
