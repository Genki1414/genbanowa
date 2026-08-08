import Stripe from "stripe";

/**
 * Server Action / webhook からしか使わない（Stripeの秘密鍵を扱うため）。
 * クライアントコンポーネントに渡さないこと。
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
