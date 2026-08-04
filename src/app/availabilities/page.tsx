import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { Btn } from "@/components/ui/Btn";
import { MineSection } from "@/components/domain/MineSection";
import { WithdrawAvailabilityButton } from "@/components/domain/WithdrawAvailabilityButton";
import { AvailabilityFilterBar } from "@/components/domain/AvailabilityFilterBar";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadOpenAvailabilities, loadMyAvailabilities, AvailabilityListItem } from "@/lib/supabase/jobRepo";
import { can } from "@/domain/auth/Permission";
import { yen } from "@/domain/shared/money";
import { range, fmt } from "@/domain/shared/date";

const KIND_LABEL = { ninku: "人工の空き", waku: "工事枠の空き" } as const;

function AvailabilityCard({
  availability: a,
  mine,
  canManage,
  canScout,
}: {
  availability: AvailabilityListItem;
  mine: boolean;
  canManage: boolean;
  canScout: boolean;
}) {
  return (
    <DenpyoCard tone={mine ? "midori" : "plain"}>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <Chip color={C.usu}>{KIND_LABEL[a.kind]}</Chip>
        <Chip color={C.usu}>{a.industry}</Chip>
        <Chip color={C.usu}>{a.area}</Chip>
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
      <div className="text-[10px] mt-1.5" style={{ color: C.usu }}>
        投稿 {fmt(a.postedAt)}
      </div>
      {mine && canManage && (
        <div className="mt-2">
          <WithdrawAvailabilityButton id={a.id} />
        </div>
      )}
      {!mine && canScout && (
        <div className="mt-2">
          <Link href={`/scouts/new?availability=${a.id}`}>
            <Btn tone="ki">この業者にスカウトを送る</Btn>
          </Link>
        </div>
      )}
    </DenpyoCard>
  );
}

export default async function AvailabilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; industry?: string }>;
}) {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const { q = "", area = "すべて", industry = "すべて" } = await searchParams;

  const supabase = await createClient();
  const [openList, myList] = await Promise.all([loadOpenAvailabilities(supabase), loadMyAvailabilities(supabase, actor.companyId)]);
  const canManage = can(actor.role, "availability.manage");
  const canScout = can(actor.role, "scout.send");

  const areas = ["すべて", ...Array.from(new Set(openList.map((a) => a.area.slice(0, 3))))];
  const industries = ["すべて", ...Array.from(new Set(openList.map((a) => a.industry)))];

  const hasFilter = !!q || area !== "すべて" || industry !== "すべて";

  const otherList = openList
    .filter((a) => a.companyId !== actor.companyId)
    .filter(
      (a) =>
        (area === "すべて" || a.area.startsWith(area)) &&
        (industry === "すべて" || a.industry === industry) &&
        (!q || (a.companyName + a.area + a.industry + (a.note ?? "")).includes(q)),
    );

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
        <AvailabilityFilterBar areas={areas} industries={industries} initial={{ q, area, industry }} />

        <MineSection label="自社の投稿" count={myList.length}>
          {myList.map((a) => (
            <AvailabilityCard key={a.id} availability={a} mine canManage={canManage} canScout={canScout} />
          ))}
        </MineSection>

        {otherList.length === 0 && (
          <p className="text-[12px] py-6 text-center" style={{ color: C.usu }}>
            {hasFilter ? "条件に合う空き情報がありません。絞り込みを変えてみてください。" : "今は掲載中の空き情報がありません。"}
          </p>
        )}
        {otherList.map((a) => (
          <AvailabilityCard key={a.id} availability={a} mine={false} canManage={canManage} canScout={canScout} />
        ))}
      </main>
    </div>
  );
}
