import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { Btn } from "@/components/ui/Btn";
import { WithdrawAvailabilityButton } from "@/components/domain/WithdrawAvailabilityButton";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadOpenAvailabilities } from "@/lib/supabase/jobRepo";
import { can } from "@/domain/auth/Permission";
import { yen } from "@/domain/shared/money";
import { range } from "@/domain/shared/date";

const KIND_LABEL = { ninku: "人工の空き", waku: "工事枠の空き" } as const;

export default async function AvailabilitiesPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const list = await loadOpenAvailabilities(supabase);
  const canManage = can(actor.role, "availability.manage");

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader
        title="空き情報"
        right={
          canManage ? (
            <Link href="/availabilities/new" className="text-[13px] font-bold px-2 py-1" style={{ color: C.ki }}>
              + 投稿
            </Link>
          ) : undefined
        }
      />
      <main className="max-w-md mx-auto p-3">
        {list.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            今は掲載中の空き情報がありません。
          </p>
        )}
        {list.map((a) => {
          const mine = a.companyId === actor.companyId;
          return (
            <DenpyoCard key={a.id} tone={mine ? "midori" : "plain"}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Chip color={C.usu}>{KIND_LABEL[a.kind]}</Chip>
                <Chip color={C.usu}>{a.industry}</Chip>
                <Chip color={C.usu}>{a.area}</Chip>
                {mine && (
                  <Chip solid color={C.midori}>
                    自社
                  </Chip>
                )}
              </div>
              <Link href={`/companies/${a.companyId}`} className="block mb-1 text-[14px] font-extrabold underline" style={{ color: C.sumi }}>
                {a.companyName}
              </Link>
              <div className="text-[12px] mb-1.5" style={{ color: C.usu }}>
                {a.area}
              </div>
              <div className="text-[13px] font-bold mb-1" style={{ color: C.sumi }}>
                {range(a.fromDate, a.toDate)}
              </div>
              <div className="flex items-center gap-2">
                {a.headcount > 0 && (
                  <span className="text-[12px]" style={{ color: C.usu }}>
                    {a.headcount}人
                  </span>
                )}
                <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
                  {a.tanka > 0 ? `${yen(a.tanka)}／人工` : "応相談"}
                </span>
              </div>
              {a.note && (
                <p className="text-[12px] mt-1" style={{ color: C.usu }}>
                  {a.note}
                </p>
              )}
              {mine && canManage && (
                <div className="mt-2">
                  <WithdrawAvailabilityButton id={a.id} />
                </div>
              )}
              {!mine && can(actor.role, "scout.send") && (
                <div className="mt-2">
                  <Link href={`/scouts/new?availability=${a.id}`}>
                    <Btn tone="ki">この業者にスカウトを送る</Btn>
                  </Link>
                </div>
              )}
            </DenpyoCard>
          );
        })}
      </main>
    </div>
  );
}
