import Stripe from "stripe";

/**
 * Server Action / webhook からしか使わない（Stripeの秘密鍵を扱うため）。
 * クライアントコンポーネントに渡さないこと。
 *
 * モジュール読み込み時にnew Stripe()すると、STRIPE_SECRET_KEY未設定の環境
 * （Vercelのビルド時、キーを本番投入する前など）でビルド自体が失敗する
 * （Next.jsがpage data収集のため/api/stripe/webhookを静的にimportするため）。
 * 実際に呼ばれるまで生成を遅らせることで、鍵未設定でもビルドは通るようにする。
 */
let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return cached;
}
