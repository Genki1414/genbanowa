import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationEvent, renderNotification } from "@/domain/notification/Notification";

/** 通知文面の{相手}に埋め込む会社名。companies_publicは公開ビューなのでRLSスコープのクライアントで良い。 */
export async function companyName(supabase: SupabaseClient<Database>, id: string): Promise<string> {
  const { data } = await supabase.from("companies_public").select("name").eq("id", id).maybeSingle();
  return data?.name ?? "取引先";
}

/**
 * 通知を1件作る。宛先は基本的に「自社ではない相手企業」なので、通常のRLS経由クライアントでは
 * 書き込めない（0017_notifications.sqlでauthenticatedのinsertを塞いである）。service role固定。
 */
export async function notify(params: {
  companyId: string;
  userId?: string;
  event: NotificationEvent;
  entityType: string;
  entityId: string;
  vars: Record<string, string>;
  linkPath: string;
}): Promise<void> {
  const { severity, title, body } = renderNotification(params.event, params.vars);
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    company_id: params.companyId,
    user_id: params.userId ?? null,
    event: params.event,
    severity,
    entity_type: params.entityType,
    entity_id: params.entityId,
    title,
    body,
    link: params.linkPath,
  });
  // 通知の失敗で本体の操作（注文書送信など）まで失敗させたくないので投げないが、
  // 黙って消えると気づけないのでログにだけは残す。
  if (error) {
    console.error(`[notify] failed to insert notification (event=${params.event}, company=${params.companyId}):`, error.message);
  }
}

/** 取引の両当事者に同じイベントを通知する（異議申立の運営引き上げ・確定判断など）。 */
export async function notifyBoth(params: {
  companyIdA: string;
  companyIdB: string;
  event: NotificationEvent;
  entityType: string;
  entityId: string;
  vars: Record<string, string>;
  linkPath: string;
}): Promise<void> {
  await Promise.all([
    notify({ ...params, companyId: params.companyIdA }),
    notify({ ...params, companyId: params.companyIdB }),
  ]);
}
