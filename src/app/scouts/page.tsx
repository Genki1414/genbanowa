import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { OpenScoutButton } from "@/components/domain/OpenScoutButton";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadReceivedScouts } from "@/lib/supabase/scoutRepo";
import { can } from "@/domain/auth/Permission";
import { fmt } from "@/domain/shared/date";

const KIND_LABEL = { scout: "スカウト", quote_request: "見積依頼" } as const;

export default async function ScoutsPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "scout.read")) redirect("/jobs");

  const supabase = await createClient();
  const scouts = await loadReceivedScouts(supabase, actor.companyId);

  const companyIds = [...new Set(scouts.map((s) => s.fromCompanyId))];
  const { data: companies } = companyIds.length
    ? await supabase.from("companies_public").select("id, name").in("id", companyIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader
        title="スカウト"
        right={
          <Link href="/scouts/sent" className="text-[12px] font-bold px-2 py-1" style={{ color: C.ki }}>
            送信済み
          </Link>
        }
      />
      <main className="max-w-md mx-auto p-3">
        {scouts.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            まだスカウトが届いていません。
          </p>
        )}
        {scouts.map((s) => (
          <DenpyoCard key={s.id} tone={s.openedAt ? "plain" : "ki"}>
            <div className="flex items-center gap-2 mb-1">
              <Chip color={C.usu}>{KIND_LABEL[s.kind]}</Chip>
              <span className="flex-1" />
              <span className="text-[11px]" style={{ color: C.usu }}>
                {fmt(s.createdAt.slice(0, 10))}
              </span>
            </div>
            <div className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
              {nameById.get(s.fromCompanyId) ?? "—"}
            </div>
            {s.openedAt ? (
              <>
                <p className="text-[13px]" style={{ color: C.sumi }}>
                  {s.message}
                </p>
                <Link
                  href={`/messages/new?company=${s.fromCompanyId}&name=${encodeURIComponent(nameById.get(s.fromCompanyId) ?? "")}`}
                  className="block mt-2 text-[12px] font-bold underline"
                  style={{ color: C.sumi }}
                >
                  メッセージで返信する
                </Link>
              </>
            ) : (
              <OpenScoutButton scoutId={s.id} />
            )}
          </DenpyoCard>
        ))}
      </main>
    </div>
  );
}
