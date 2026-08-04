import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Check, X, Globe } from "lucide-react";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Row } from "@/components/ui/Row";
import { Chip } from "@/components/ui/Chip";
import { Btn } from "@/components/ui/Btn";
import { Gate } from "@/components/ui/Gate";
import { SubmitTrustDocumentForm } from "@/components/domain/SubmitTrustDocumentForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  loadCompanyProfile,
  loadCompanyStats,
  loadCompanyRating,
  loadCompanyUrl,
  loadCompanyPayment,
  loadTrustDocChecklist,
} from "@/lib/supabase/companyRepo";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { canSeeStats, canSeeRating, canSeePayment } from "@/domain/company/Company";
import { PLANS } from "@/domain/plan/Plan";
import { TrustDocKind } from "@/lib/supabase/database.types";

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const profile = await loadCompanyProfile(supabase, id);
  if (!profile) notFound();

  const isOwnCompany = id === actor.companyId;
  const plan = await getCompanyPlan(supabase, actor.companyId);
  const info = plan.info;

  const [stats, rating, url, payment, checklist] = await Promise.all([
    canSeeStats(info) ? loadCompanyStats(supabase, id) : null,
    canSeeRating(info) ? loadCompanyRating(supabase, id) : null,
    loadCompanyUrl(supabase, id),
    canSeePayment(info) ? loadCompanyPayment(supabase, id) : null,
    isOwnCompany ? loadTrustDocChecklist(supabase, id) : null,
  ]);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title={profile.name} />
      <main className="max-w-md mx-auto p-3">
        <DenpyoCard tone="ki">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Chip solid color={C.midori}>
              信用 {profile.trustLevel}
            </Chip>
            {profile.industries.map((ind) => (
              <Chip key={ind} color={C.sumi}>
                {ind}
              </Chip>
            ))}
            <span className="flex-1" />
            <span className="text-[12px] font-extrabold" style={{ color: C.usu }}>
              {profile.trustScore}点
            </span>
          </div>
          {profile.repName && <Row label="代表者" value={profile.repName} />}
          {profile.established && <Row label="設立" value={profile.established} mono />}
          {profile.area && <Row label="所在地" value={profile.area} />}
          {profile.licenseNo && <Row label="建設業許可" value={profile.licenseNo} mono />}
          {url !== null && (
            <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${C.keisen}` }}>
              <Gate ok={canSeeRating(info)} need={PLANS.pro.name}>
                <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] font-bold underline" style={{ color: C.sumi }}>
                  <Globe size={15} style={{ color: C.usu }} />
                  ホームページ・SNSを見る
                </a>
              </Gate>
            </div>
          )}
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          提出されている書類
        </h2>
        <DenpyoCard tone="plain">
          {(checklist ?? []).length === 0 && !isOwnCompany && (
            <p className="text-[12px]" style={{ color: C.usu }}>
              提出書類はありません。
            </p>
          )}
          {isOwnCompany
            ? checklist!.map((d) => (
                <div key={d.kind} className="flex items-center gap-2 py-[6px]" style={{ borderBottom: `1px dashed ${C.keisen}` }}>
                  {d.status === "approved" ? (
                    <Check size={15} style={{ color: C.midori, flexShrink: 0 }} />
                  ) : (
                    <X size={15} style={{ color: C.keisen, flexShrink: 0 }} />
                  )}
                  <span className="flex-1 text-[12px]" style={{ color: d.status === "approved" ? C.sumi : C.usu }}>
                    {d.label}
                    {d.status === "pending" && <span style={{ color: C.ki }}> ・確認中</span>}
                    {d.status === "rejected" && <span style={{ color: C.aka }}> ・却下</span>}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: d.status === "approved" ? C.midori : C.keisen }}>
                    +{d.points}
                  </span>
                  {d.status === "not_submitted" && <SubmitTrustDocumentForm kind={d.kind as TrustDocKind} label={d.label} />}
                </div>
              ))
            : profile.approvedDocKinds.map((kind) => (
                <div key={kind} className="flex items-center gap-2 py-[5px]">
                  <Check size={15} style={{ color: C.midori, flexShrink: 0 }} />
                  <span className="text-[12px]" style={{ color: C.sumi }}>
                    {kind}
                  </span>
                </div>
              ))}
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          取引実績
        </h2>
        <DenpyoCard tone={canSeeStats(info) ? "plain" : "usu"}>
          <Gate ok={canSeeStats(info)} need={PLANS.std.name}>
            <div className="flex gap-2">
              {[
                ["発注数", stats?.hacchuCount ?? 0],
                ["受注数", stats?.jucchuCount ?? 0],
                ["取引社数", stats?.partnerCount ?? 0],
              ].map(([l, v]) => (
                <div key={l} className="flex-1 py-2 text-center rounded-sm" style={{ background: C.yojo }}>
                  <div className="text-[20px] font-extrabold" style={{ color: C.sumi }}>
                    {v}
                  </div>
                  <div className="text-[10px]" style={{ color: C.usu }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </Gate>
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          運営による評価
        </h2>
        <DenpyoCard tone={canSeeRating(info) ? "plain" : "usu"}>
          <Gate ok={canSeeRating(info)} need={PLANS.pro.name}>
            <p className="text-[15px] font-extrabold" style={{ color: C.sumi }}>
              {rating ? `★ ${rating.stars}` : "評価はまだありません"}
            </p>
            <p className="text-[11px] mt-2" style={{ color: C.usu }}>
              企業情報の充実度と取引の実績をもとに、運営が付けた評価です。
            </p>
          </Gate>
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          支払いの実績
        </h2>
        <DenpyoCard tone={canSeePayment(info) ? "plain" : "usu"}>
          <Gate ok={canSeePayment(info)} need={PLANS.prem.name}>
            <div className="flex gap-2 mb-2">
              <div className="flex-1 py-2 text-center rounded-sm" style={{ background: C.yojo }}>
                <div className="text-[20px] font-extrabold" style={{ color: C.midori }}>
                  {payment?.ontimeCount ?? 0}
                </div>
                <div className="text-[10px]" style={{ color: C.usu }}>
                  期日内の支払
                </div>
              </div>
              <div className="flex-1 py-2 text-center rounded-sm" style={{ background: C.yojo }}>
                <div className="text-[20px] font-extrabold" style={{ color: (payment?.delayCount ?? 0) > 0 ? C.aka : C.sumi }}>
                  {payment?.delayCount ?? 0}
                </div>
                <div className="text-[10px]" style={{ color: C.usu }}>
                  遅延
                </div>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: C.usu }}>
              遅延として載るのは、相手への確認と運営の事実確認を経て確定したものだけです。
            </p>
          </Gate>
        </DenpyoCard>

        {!isOwnCompany && (
          <div className="mt-4">
            <Link href={`/messages/new?company=${id}&name=${encodeURIComponent(profile.name)}`}>
              <Btn tone="ki">この会社にメッセージを送る</Btn>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
