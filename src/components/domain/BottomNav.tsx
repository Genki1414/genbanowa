import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadConversationList } from "@/lib/supabase/conversationRepo";
import { can } from "@/domain/auth/Permission";
import { BottomNavClient, NavTabData } from "./BottomNavClient";

/**
 * 主要画面（一覧・ハブ）だけに置く下部タブ。個別スレッドやフォームなど
 * 「戻る」で完結する画面には置かない（BackHeaderのパターンと役割分担）。
 * 「取引」タブは unlocked_features に "transactions" が入っているときだけ出す
 * （CLAUDE.md「絶対に守ること」2：段階開放）。
 */
export async function BottomNav() {
  const actor = await currentActor();
  if (!actor) return null;

  const supabase = await createClient();
  const [{ data: company }, list] = await Promise.all([
    supabase.from("companies").select("unlocked_features").eq("id", actor.companyId).maybeSingle(),
    loadConversationList(supabase, actor.companyId),
  ]);

  const unread = list.reduce((n, c) => n + c.unread, 0);
  const showTransactions = (company?.unlocked_features ?? []).includes("transactions");

  const tabs: NavTabData[] = [{ key: "messages", label: "メッセージ", href: "/messages", icon: "MessageSquare", badge: unread }];
  if (showTransactions) {
    tabs.push({ key: "transactions", label: "取引", href: "/transactions", icon: "FileText" });
  }
  if (can(actor.role, "user.invite")) {
    tabs.push({ key: "members", label: "メンバー", href: "/me/members", icon: "Users" });
  }

  return <BottomNavClient tabs={tabs} />;
}
