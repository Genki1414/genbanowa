import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadSentScouts } from "@/lib/supabase/scoutRepo";
import { can } from "@/domain/auth/Permission";
import { fmt } from "@/domain/shared/date";

const KIND_LABEL = { scout: "スカウト", quote_request: "見積依頼" } as const;

export default async function SentScoutsPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "scout.send")) redirect("/jobs");

  const supabase = await createClient();
  const scouts = await loadSentScouts(supabase, actor.companyId);

  const companyIds = [...new Set(scouts.map((s) => s.toCompanyId))];
  const { data: companies } = companyIds.length
    ? await supabase.from("companies_public").select("id, name").in("id", companyIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="送信済みスカウト" />
      <main className="max-w-md mx-auto p-3">
        {scouts.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            まだスカウトを送っていません。
          </p>
        )}
        {scouts.map((s) => (
          <DenpyoCard key={s.id} tone="plain">
            <div className="flex items-center gap-2 mb-1">
              <Chip color={C.usu}>{KIND_LABEL[s.kind]}</Chip>
              <span className="flex-1" />
              {s.openedAt ? <Chip color={C.midori}>既読</Chip> : <Chip color={C.usu}>未読</Chip>}
              <span className="text-[11px]" style={{ color: C.usu }}>
                {fmt(s.createdAt.slice(0, 10))}
              </span>
            </div>
            <div className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
              {nameById.get(s.toCompanyId) ?? "—"}
            </div>
            <p className="text-[13px]" style={{ color: C.sumi }}>
              {s.message}
            </p>
          </DenpyoCard>
        ))}
      </main>
    </div>
  );
}
