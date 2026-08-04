import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { StartConversationForm } from "@/components/domain/StartConversationForm";
import { currentActor } from "@/lib/auth";

export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; name?: string }>;
}) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  const { company, name } = await searchParams;

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="新しいやり取り" />
      <main className="max-w-md mx-auto p-3">
        <StartConversationForm preselected={company && name ? { id: company, name } : undefined} />
      </main>
    </div>
  );
}
