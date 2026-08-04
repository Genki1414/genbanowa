import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Row } from "@/components/ui/Row";
import { Chip } from "@/components/ui/Chip";
import { IssueStandaloneDocumentForm } from "@/components/domain/IssueStandaloneDocumentForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadPartner, loadStandaloneDocuments } from "@/lib/supabase/partnerRepo";
import { can } from "@/domain/auth/Permission";
import { yen } from "@/domain/shared/money";
import { fmt } from "@/domain/shared/date";

const KIND_LABEL = { estimate: "見積書", order: "注文書", invoice: "請求書" } as const;

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "partner.manage")) redirect("/transactions");

  const supabase = await createClient();
  const partner = await loadPartner(supabase, id);
  if (!partner) notFound();
  if (partner.companyId !== actor.companyId) notFound();

  const documents = await loadStandaloneDocuments(supabase, actor.companyId, id);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title={partner.name} />
      <main className="max-w-md mx-auto p-3">
        <DenpyoCard tone="plain">
          {partner.contactName && <Row label="担当者" value={partner.contactName} />}
          {partner.closingDay && <Row label="締め日" value={partner.closingDay} />}
          {partner.paymentTerms && <Row label="支払日" value={partner.paymentTerms} />}
          {partner.email && <Row label="メール" value={partner.email} />}
          {partner.tel && <Row label="電話番号" value={partner.tel} />}
        </DenpyoCard>

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          発行した書類
        </h2>
        {documents.length === 0 && (
          <p className="text-[12px] mb-3" style={{ color: C.usu }}>
            まだ書類がありません。
          </p>
        )}
        {documents.map((d) => (
          <DenpyoCard key={d.id} tone="plain">
            <div className="flex items-center gap-2 mb-1">
              <Chip color={C.usu}>{KIND_LABEL[d.kind]}</Chip>
              <span className="flex-1" />
              <span className="text-[11px]" style={{ color: C.usu }}>
                {fmt(d.createdAt.slice(0, 10))}
              </span>
            </div>
            <div className="text-[13px] font-bold mb-1" style={{ color: C.sumi }}>
              {d.title}
            </div>
            <div className="text-[13px] font-bold" style={{ color: C.sumi }}>
              {yen(d.amount + d.tax)}
            </div>
          </DenpyoCard>
        ))}

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          + 書類を発行する
        </h2>
        <IssueStandaloneDocumentForm partnerId={id} />
      </main>
    </div>
  );
}
