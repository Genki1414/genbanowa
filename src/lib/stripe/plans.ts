import { PlanKey } from "@/domain/plan/Plan";

/** Stripeダッシュボードで作成したPriceのID。無料プランはStripe側に存在しない。 */
export const STRIPE_PRICE_BY_PLAN: Partial<Record<Exclude<PlanKey, "free">, string | undefined>> = {
  std: process.env.STRIPE_PRICE_STD,
  pro: process.env.STRIPE_PRICE_PRO,
  prem: process.env.STRIPE_PRICE_PREM,
};

export function priceIdForPlan(plan: Exclude<PlanKey, "free">): string | null {
  return STRIPE_PRICE_BY_PLAN[plan] ?? null;
}

export function planKeyForPriceId(priceId: string): PlanKey | null {
  for (const [key, id] of Object.entries(STRIPE_PRICE_BY_PLAN)) {
    if (id === priceId) return key as PlanKey;
  }
  return null;
}
