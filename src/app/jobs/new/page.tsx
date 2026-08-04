import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { NewJobForm } from "@/components/domain/NewJobForm";
import { currentActor } from "@/lib/auth";
import { can } from "@/domain/auth/Permission";

export default async function NewJobPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "job.post")) redirect("/jobs");

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="案件を投稿する" />
      <main className="max-w-md mx-auto p-3">
        <NewJobForm />
      </main>
    </div>
  );
}
