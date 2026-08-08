import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { Notification } from "@/domain/notification/Notification";

export type Client = SupabaseClient<Database>;

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id ?? undefined,
    event: row.event as Notification["event"],
    severity: row.severity,
    entityType: row.entity_type,
    entityId: row.entity_id ?? "",
    title: row.title,
    body: row.body,
    linkPath: row.link,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** 自分に見えている通知（会社全員向け＋自分個人向け）。RLSが絞る。 */
export async function loadNotifications(supabase: Client, limit = 50): Promise<Notification[]> {
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(toNotification);
}

export async function unreadCount(supabase: Client): Promise<number> {
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function markRead(supabase: Client, id: string) {
  return supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllRead(supabase: Client) {
  return supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
}
