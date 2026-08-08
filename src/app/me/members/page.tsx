import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
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
      <BackHeader title="メンバー" />
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
        <Link href={`/companies/${actor.companyId}`} className="block text-[13px] font-bold underline mb-2" style={{ color: C.sumi }}>
          自社ページを見る
        </Link>
        {can(actor.role, "company.edit") && (
          <Link href="/me/company" className="block text-[13px] font-bold underline mb-2" style={{ color: C.sumi }}>
            自社プロフィールを編集する
          </Link>
        )}
        <Link href="/partners" className="block text-[13px] font-bold underline mb-2" style={{ color: C.sumi }}>
          取引先（アプリ外）を管理する
        </Link>
        {can(actor.role, "plan.change") && (
          <Link href="/me/plan" className="block text-[13px] font-bold underline" style={{ color: C.sumi }}>
            プラン・請求を管理する
          </Link>
        )}

        {actor.isStaff && (
          <>
            <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
              運営
            </h2>
            <Link href="/admin/disputes" className="block text-[13px] font-bold underline mb-2" style={{ color: C.sumi }}>
              入金確認・異議申立を確認する
            </Link>
            <Link href="/admin/trust-documents" className="block text-[13px] font-bold underline" style={{ color: C.sumi }}>
              信用書類を確認する
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
