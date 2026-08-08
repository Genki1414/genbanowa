import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { CompanyProfileForm } from "@/components/domain/CompanyProfileForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadOwnCompanyProfile } from "@/lib/supabase/companyRepo";
import { can } from "@/domain/auth/Permission";

export default async function CompanyEditPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "company.edit")) redirect("/transactions");

  const supabase = await createClient();
  const profile = await loadOwnCompanyProfile(supabase, actor.companyId);
  if (!profile) notFound();

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="自社プロフィールを編集" />
      <main className="max-w-md mx-auto p-3">
        <CompanyProfileForm profile={profile} companyId={actor.companyId} canEditApprovalLimit={actor.role === "owner" || actor.role === "admin"} />
      </main>
    </div>
  );
}
