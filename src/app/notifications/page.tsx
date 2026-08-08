import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { NotificationList } from "@/components/domain/NotificationList";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadNotifications } from "@/lib/supabase/notificationRepo";

export default async function NotificationsPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const notifications = await loadNotifications(supabase);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <Header title="通知" />
      <main className="max-w-md mx-auto p-3">
        <NotificationList notifications={notifications} />
      </main>
    </div>
  );
}
