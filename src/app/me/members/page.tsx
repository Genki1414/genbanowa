import { redirect } from "next/navigation";
import { Building2, FileText, Handshake, CreditCard, AlertTriangle, ShieldCheck } from "lucide-react";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { MenuCard } from "@/components/ui/MenuCard";
import { MenuRow } from "@/components/ui/MenuRow";
import { InviteMemberForm } from "@/components/domain/InviteMemberForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/domain/auth/Permission";
import { ROLE_LABEL, Role } from "@/domain/auth/Role";

export default async function MembersPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "user.invite")) redirect("/transactions");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("company_id", actor.companyId)
    .order("created_at");

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="設定" />
      <main className="max-w-md mx-auto p-3">
        <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
          メンバー一覧
        </h2>
        {(members ?? []).map((m) => (
          <DenpyoCard key={m.id} tone="plain">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
                {m.name}
              </span>
              <span className="flex-1" />
              <Chip color={C.usu}>{ROLE_LABEL[m.role as Role]}</Chip>
            </div>
          </DenpyoCard>
        ))}

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          メンバーを招待
        </h2>
        <InviteMemberForm />

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          自社ページ・アプリ外の書類
        </h2>
        <MenuCard>
          <MenuRow href={`/companies/${actor.companyId}`} icon={Building2} label="自社ページを見る" />
          {can(actor.role, "company.edit") && <MenuRow href="/me/company" icon={FileText} label="自社プロフィールを編集する" />}
          <MenuRow href="/partners" icon={Handshake} label="取引先（アプリ外）を管理する" />
          {can(actor.role, "plan.change") && <MenuRow href="/me/plan" icon={CreditCard} label="プラン・請求を管理する" />}
        </MenuCard>

        {actor.isStaff && (
          <>
            <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
              運営
            </h2>
            <MenuCard>
              <MenuRow href="/admin/disputes" icon={AlertTriangle} label="入金確認・異議申立を確認する" tone="ki" />
              <MenuRow href="/admin/trust-documents" icon={ShieldCheck} label="信用書類を確認する" tone="ki" />
            </MenuCard>
          </>
        )}
      </main>
    </div>
  );
}
