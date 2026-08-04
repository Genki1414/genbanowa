import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { PostAvailabilityForm } from "@/components/domain/PostAvailabilityForm";
import { currentActor } from "@/lib/auth";
import { can } from "@/domain/auth/Permission";

export default async function NewAvailabilityPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "availability.manage")) redirect("/availabilities");

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="空き情報を投稿する" />
      <main className="max-w-md mx-auto p-3">
        <PostAvailabilityForm />
      </main>
    </div>
  );
}
