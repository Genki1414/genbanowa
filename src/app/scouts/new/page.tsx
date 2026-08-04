import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { SendScoutForm } from "@/components/domain/SendScoutForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJob, loadAvailability } from "@/lib/supabase/jobRepo";
import { can } from "@/domain/auth/Permission";

export default async function NewScoutPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; availability?: string }>;
}) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "scout.send")) redirect("/jobs");

  const { job: jobId, availability: availabilityId } = await searchParams;
  const supabase = await createClient();

  let jobName: string | undefined;
  if (jobId) {
    const job = await loadJob(supabase, jobId);
    if (job && job.companyId === actor.companyId) jobName = job.name;
  }

  let preselectedCompany: { id: string; name: string } | undefined;
  if (availabilityId) {
    const availability = await loadAvailability(supabase, availabilityId);
    if (availability && availability.companyId !== actor.companyId) {
      const { data: company } = await supabase.from("companies_public").select("name").eq("id", availability.companyId).maybeSingle();
      if (company) preselectedCompany = { id: availability.companyId, name: company.name };
    }
  }

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="スカウトを送る" />
      <main className="max-w-md mx-auto p-3">
        <SendScoutForm
          jobId={jobName ? jobId : undefined}
          jobName={jobName}
          availabilityId={preselectedCompany ? availabilityId : undefined}
          preselectedCompany={preselectedCompany}
        />
      </main>
    </div>
  );
}
