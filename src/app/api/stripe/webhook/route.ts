import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { planKeyForPriceId } from "@/lib/stripe/plans";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripeからのwebhook受信専用。署名検証があるためService Actionではなくroute handlerで実装する。
 * companies.plan / stripe_* の書き込みはここ（service role）からしか行われない
 * （0016_billing.sqlで通常ユーザーからの直接更新を塞いである）。
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: `signature verification failed: ${(e as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const companyId = session.metadata?.company_id;
      if (companyId && typeof session.customer === "string") {
        await admin
          .from("companies")
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          })
          .eq("id", companyId);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.company_id;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? planKeyForPriceId(priceId) : null;
      if (companyId && plan) {
        await admin
          .from("companies")
          .update({ plan, plan_since: new Date().toISOString(), stripe_subscription_id: subscription.id })
          .eq("id", companyId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.company_id;
      if (companyId) {
        await admin
          .from("companies")
          .update({ plan: "free", plan_since: new Date().toISOString(), stripe_subscription_id: null })
          .eq("id", companyId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
