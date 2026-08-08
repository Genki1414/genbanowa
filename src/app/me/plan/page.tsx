import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { UpgradeButton, ManageBillingButton } from "@/components/domain/PlanActionButtons";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/domain/auth/Permission";
import { PLANS, PlanKey, lim } from "@/domain/plan/Plan";

const PLAN_ORDER: PlanKey[] = ["free", "std", "pro", "prem"];

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "plan.change")) redirect("/transactions");

  const { checkout } = await searchParams;

  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("plan, stripe_subscription_id").eq("id", actor.companyId).maybeSingle();
  const currentPlan = (company?.plan ?? "free") as PlanKey;
  const hasSubscription = !!company?.stripe_subscription_id;

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader title="プラン・請求" />
      <main className="max-w-md mx-auto p-3">
        {checkout === "success" && (
          <p className="text-[12px] mb-3 p-2 rounded-sm" style={{ background: "#fff", color: C.midori, border: `1px solid ${C.midori}` }}>
            お手続きありがとうございます。プランの反映まで少し時間がかかる場合があります。
          </p>
        )}
        {checkout === "cancel" && (
          <p className="text-[12px] mb-3" style={{ color: C.usu }}>
            プラン変更は行われませんでした。
          </p>
        )}

        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isCurrent = key === currentPlan;
          return (
            <DenpyoCard key={key} tone={isCurrent ? "midori" : "plain"}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[15px] font-extrabold" style={{ color: C.sumi }}>
                  {plan.name}
                </span>
                {isCurrent && <Chip solid color={C.midori}>現在のプラン</Chip>}
                <span className="flex-1" />
                <span className="text-[15px] font-extrabold" style={{ color: C.sumi }}>
                  {plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}／月`}
                </span>
              </div>
              <div className="text-[12px] mb-2" style={{ color: C.usu }}>
                やり取り {lim(plan.send)}件・スカウト送信 {lim(plan.scout)}件・空き情報 {lim(plan.aki)}件・現場フォルダ {lim(plan.site)}件・書類発行{" "}
                {plan.docs ? "可" : "不可"}
              </div>
              {!isCurrent && key !== "free" && !hasSubscription && (
                <UpgradeButton plan={key as Exclude<PlanKey, "free">} label={`${plan.name}にする`} />
              )}
            </DenpyoCard>
          );
        })}

        {hasSubscription && (
          <div className="mt-4">
            <ManageBillingButton />
            <p className="text-[11px] mt-2" style={{ color: C.usu }}>
              プランの変更・解約・お支払い方法の更新はこちらから行えます。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
