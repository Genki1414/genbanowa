"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { stripe } from "@/lib/stripe/client";
import { priceIdForPlan } from "@/lib/stripe/plans";
import { PlanKey } from "@/domain/plan/Plan";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * プラン変更用のStripe Checkoutセッションを作る。owner のみ（04_権限ロール設計.md 2-4）。
 * stripe_customer_id の書き込みはservice role経由のみ（companiesの列権限を絞ってあるため
 * 通常のクライアントからは書けない。0016_billing.sql参照）。
 */
export async function createCheckoutSessionAction(plan: Exclude<PlanKey, "free">): Promise<Result<{ url: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "plan.change")) return err("PERMISSION_DENIED");

  const priceId = priceIdForPlan(plan);
  if (!priceId) return err("PRICE_NOT_CONFIGURED");

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name, stripe_customer_id, stripe_subscription_id")
    .eq("id", actor.companyId)
    .maybeSingle();
  if (!company) return err("COMPANY_NOT_FOUND");

  if (company.stripe_subscription_id) {
    // 既にサブスクリプションがある会社はCheckoutではなくCustomer Portalでプラン変更させる
    // （二重サブスクリプションを防ぐ）。
    return err("ALREADY_SUBSCRIBED");
  }

  const admin = createAdminClient();
  let customerId = company.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      metadata: { company_id: actor.companyId },
    });
    customerId = customer.id;
    await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", actor.companyId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/me/plan?checkout=success`,
    cancel_url: `${appUrl()}/me/plan?checkout=cancel`,
    metadata: { company_id: actor.companyId },
    subscription_data: { metadata: { company_id: actor.companyId } },
  });
  if (!session.url) return err("CHECKOUT_SESSION_FAILED");

  return ok({ url: session.url });
}

/** 既存サブスクリプションのプラン変更・解約はStripeのCustomer Portalに任せる。 */
export async function createPortalSessionAction(): Promise<Result<{ url: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "plan.change")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("stripe_customer_id").eq("id", actor.companyId).maybeSingle();
  if (!company?.stripe_customer_id) return err("NO_SUBSCRIPTION");

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${appUrl()}/me/plan`,
  });

  return ok({ url: session.url });
}
