"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/styles/tokens";
import { Chip } from "@/components/ui/Chip";
import { Notification, Severity } from "@/domain/notification/Notification";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/actions/notification";

const SEVERITY_COLOR: Record<Severity, string> = { A: C.aka, B: C.ki, C: C.usu };
const SEVERITY_LABEL: Record<Severity, string> = { A: "重要", B: "お知らせ", C: "共有" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.readAt);

  const open = (n: Notification) => {
    startTransition(async () => {
      if (!n.readAt) await markNotificationReadAction(n.id);
      if (n.linkPath) router.push(n.linkPath);
      else router.refresh();
    });
  };

  const markAll = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  return (
    <div>
      {hasUnread && (
        <button onClick={markAll} disabled={pending} className="block ml-auto mb-2 text-[12px] font-bold" style={{ color: C.usu }}>
          すべて既読にする
        </button>
      )}
      {notifications.length === 0 && (
        <p className="text-[12px] py-10 text-center" style={{ color: C.usu }}>
          通知はまだありません。
        </p>
      )}
      {notifications.map((n) => (
        <button
          key={n.id}
          onClick={() => open(n)}
          disabled={pending}
          className="w-full text-left p-3 mb-2 rounded-sm disabled:opacity-60"
          style={{
            background: n.readAt ? C.kami : "#fff",
            border: `1px solid ${n.readAt ? C.keisen : SEVERITY_COLOR[n.severity]}`,
            borderLeftWidth: 4,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Chip solid={!n.readAt} color={SEVERITY_COLOR[n.severity]}>
              {SEVERITY_LABEL[n.severity]}
            </Chip>
            <span className="flex-1" />
            <span className="text-[11px]" style={{ color: C.usu }}>
              {formatDateTime(n.createdAt)}
            </span>
          </div>
          <div className="text-[14px] font-extrabold mb-0.5" style={{ color: C.sumi }}>
            {n.title}
          </div>
          <div className="text-[13px]" style={{ color: C.sumi }}>
            {n.body}
          </div>
        </button>
      ))}
    </div>
  );
}
