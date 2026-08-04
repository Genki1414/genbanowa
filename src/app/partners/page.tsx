import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { AddPartnerForm } from "@/components/domain/AddPartnerForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadPartners } from "@/lib/supabase/partnerRepo";
import { can } from "@/domain/auth/Permission";

export default async function PartnersPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "partner.manage")) redirect("/transactions");

  const supabase = await createClient();
  const partners = await loadPartners(supabase, actor.companyId);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="取引先（アプリ外）" />
      <main className="max-w-md mx-auto p-3">
        <p className="text-[12px] mb-3" style={{ color: C.usu }}>
          アプリに登録していない取引先にも、見積書・注文書・請求書を単独で発行できます。
          取引（メッセージから始まるやり取り）の記録は残りません。
        </p>
        <AddPartnerForm />
        {partners.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            まだ取引先が登録されていません。
          </p>
        )}
        {partners.map((p) => (
          <Link key={p.id} href={`/partners/${p.id}`}>
            <DenpyoCard tone="plain">
              <div className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                {p.name}
              </div>
              {p.contactName && (
                <div className="text-[12px]" style={{ color: C.usu }}>
                  {p.contactName}
                </div>
              )}
            </DenpyoCard>
          </Link>
        ))}
      </main>
    </div>
  );
}
