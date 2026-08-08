"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * /admin配下は運営専用の画面であり、案件・メッセージ・写真など会社側のBottomNavは無関係で紛らわしいため出さない。
 * ルートレイアウトはサーバーコンポーネントでパスを直接見られないため、ここでusePathname()して出し分ける。
 */
export function AppChrome({ hasActor, bottomNav, children }: { hasActor: boolean; bottomNav: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const showBottomNav = hasActor && !isAdmin;

  return (
    <>
      <div className={showBottomNav ? "flex-1 pb-14" : "flex-1"}>{children}</div>
      {showBottomNav && bottomNav}
    </>
  );
}
