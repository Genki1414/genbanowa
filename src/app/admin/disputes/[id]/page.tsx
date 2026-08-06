import { notFound, redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Row } from "@/components/ui/Row";
import { Chip } from "@/components/ui/Chip";
import { DecideDisputeForm } from "@/components/domain/DecideDisputeForm";
import { currentActor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDisputeDetail } from "@/lib/supabase/adminRepo";
import { yen } from "@/domain/shared/money";
import { fmt } from "@/domain/shared/date";
import { DisputeStatus } from "@/domain/transaction/Dispute";

const STATUS_LABEL: Record<DisputeStatus, string> = {
  overdue: "期日超過",
  confirming: "入金確認を依頼中",
  date_proposed: "支払予定日の申告あり",
  objected: "異議あり",
  under_review: "運営が事実確認中",
  resolved: "解決（記録なし）",
  recorded: "遅延として記録",
};

const ACTOR_LABEL = { uke: "受注者", moto: "発注者", admin: "運営", system: "system" } as const;

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!actor.isStaff) redirect("/transactions");

  const { id } = await params;
  const admin = createAdminClient();
  const dispute = await loadDisputeDetail(admin, id);
  if (!dispute) notFound();

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="異議申立の確認" />
      <main className="max-w-md mx-auto p-3">
        <DenpyoCard tone="plain">
          <div className="flex items-center gap-2 mb-2">
            <Chip solid color={dispute.status === "recorded" ? C.aka : dispute.status === "resolved" ? C.midori : C.usu}>
              {STATUS_LABEL[dispute.status]}
            </Chip>
          </div>
          <Row label="工事名" value={dispute.transactionTitle} />
          <Row label="発注" value={dispute.motoCompanyName} />
          <Row label="受注" value={dispute.ukeCompanyName} />
          <Row label="請求額" value={yen(dispute.amount + dispute.tax)} mono />
          <Row label="支払期日" value={fmt(dispute.dueDate)} mono />
          {dispute.proposedDate && <Row label="申告された予定日" value={fmt(dispute.proposedDate)} mono />}
        </DenpyoCard>

        {dispute.objection && (
          <div className="mt-3">
            <h2 className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
              異議の内容
            </h2>
            <p className="text-[13px]" style={{ color: C.sumi }}>
              {dispute.objection}
            </p>
          </div>
        )}

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          経緯
        </h2>
        {dispute.logs.length === 0 && (
          <p className="text-[12px] mb-3" style={{ color: C.usu }}>
            記録がありません。
          </p>
        )}
        {dispute.logs.map((l) => (
          <div key={l.id} className="text-[12px] mb-1.5" style={{ color: C.usu }}>
            <span className="font-bold" style={{ color: C.sumi }}>
              {ACTOR_LABEL[l.actor as keyof typeof ACTOR_LABEL] ?? l.actor}
            </span>
            ：{l.text}
            <span className="ml-1">（{fmt(l.createdAt)}）</span>
          </div>
        ))}

        {dispute.status === "under_review" ? (
          <div className="mt-4">
            <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
              判断
            </h2>
            <DecideDisputeForm disputeId={dispute.id} />
          </div>
        ) : (
          <>
            {dispute.decisionNote && (
              <p className="text-[12px] mt-3" style={{ color: C.usu }}>
                運営コメント：{dispute.decisionNote}
              </p>
            )}
            {dispute.status !== "resolved" && dispute.status !== "recorded" && (
              <p className="text-[12px] mt-3" style={{ color: C.usu }}>
                まだ当事者間の手続き中です。運営の判断はここには不要です。
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
