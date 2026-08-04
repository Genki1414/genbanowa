import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Row } from "@/components/ui/Row";
import { Chip } from "@/components/ui/Chip";
import { ApplyToJobForm } from "@/components/domain/ApplyToJobForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJob, loadMyApplication } from "@/lib/supabase/jobRepo";
import { recordJobDetailViewAction } from "@/app/actions/job";
import { can } from "@/domain/auth/Permission";
import { canApply } from "@/domain/job/Job";
import { yen } from "@/domain/shared/money";
import { range, fmt } from "@/domain/shared/date";

const KEISHIKI_LABEL = { ukeoi: "請負", ouen: "応援（常用）" } as const;
const STATUS_LABEL = { open: "募集中", paused: "停止中", closed: "終了" } as const;
const JISU_COLOR = { "1次下請": C.midori, "2次下請": C.usu, "3次下請": C.aka } as const;

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const job = await loadJob(supabase, id);
  if (!job) notFound();

  const isOwnJob = job.companyId === actor.companyId;
  if (!isOwnJob) {
    await recordJobDetailViewAction(id);
  }

  const application = await loadMyApplication(supabase, id, actor.companyId);
  const eligible = !isOwnJob && can(actor.role, "job.apply") && canApply(job, actor.companyId) && !application;

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title={job.name} />
      <main className="max-w-md mx-auto p-3">
        <DenpyoCard tone="plain">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Chip color={job.status === "open" ? C.midori : C.usu}>{STATUS_LABEL[job.status]}</Chip>
            <Chip solid color={JISU_COLOR[job.jisu]}>
              {job.jisu}
            </Chip>
            <Chip color={C.usu}>{KEISHIKI_LABEL[job.keishiki]}</Chip>
            {job.isPublicWork && <Chip color={C.sumi}>公共事業</Chip>}
          </div>
          <Row label="発注者" value={job.companyName} />
          <Row label="信用" value={job.trustLevel} />
          <Row label="業種" value={job.industry} />
          <Row label="エリア" value={job.area} />
          {job.siteAddress && <Row label="現場住所" value={job.siteAddress} />}
          {(job.kokiFrom || job.kokiTo) && <Row label="工期" value={range(job.kokiFrom, job.kokiTo)} />}
          {(job.boshuFrom || job.boshuTo) && <Row label="募集期間" value={range(job.boshuFrom, job.boshuTo)} />}
          {job.keishiki === "ouen" ? (
            <Row label="人工単価" value={`${yen(job.tanka)}／人工`} />
          ) : job.priceMode === "mitsumori" ? (
            <Row label="見積提出期限" value={fmt(job.quoteDue)} />
          ) : (
            <Row label="指値" value={job.price > 0 ? yen(job.price) : "応相談"} />
          )}
          {job.headcount > 0 && <Row label="必要人数" value={`${job.headcount}人`} />}
          {job.paymentTerms && <Row label="支払条件" value={job.paymentTerms} />}
        </DenpyoCard>

        {isOwnJob && (
          <p className="text-[12px] mt-3" style={{ color: C.usu }}>
            自社の案件です。
          </p>
        )}

        {application && (
          <div className="mt-3">
            <p className="text-[12px] mb-2" style={{ color: C.usu }}>
              この案件には既に応募済みです。
            </p>
            {application.conversationId && (
              <Link href={`/messages/${application.conversationId}`} className="text-[13px] font-bold underline" style={{ color: C.sumi }}>
                やり取りを見る
              </Link>
            )}
          </div>
        )}

        {eligible && (
          <div className="mt-4">
            <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
              この案件に応募する
            </h2>
            <ApplyToJobForm jobId={id} />
          </div>
        )}
      </main>
    </div>
  );
}
