import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { SendScoutForm } from "@/components/domain/SendScoutForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJob } from "@/lib/supabase/jobRepo";
import { can } from "@/domain/auth/Permission";

export default async function NewScoutPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "scout.send")) redirect("/jobs");

  const { job: jobId } = await searchParams;
  let jobName: string | undefined;
  if (jobId) {
    const supabase = await createClient();
    const job = await loadJob(supabase, jobId);
    if (job && job.companyId === actor.companyId) jobName = job.name;
  }

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="スカウトを送る" />
      <main className="max-w-md mx-auto p-3">
        <SendScoutForm jobId={jobName ? jobId : undefined} jobName={jobName} />
      </main>
    </div>
  );
}
