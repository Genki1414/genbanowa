"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FileText, Users, Briefcase, Camera, Bell } from "lucide-react";
import { C } from "@/styles/tokens";

const ICONS = { MessageSquare, FileText, Users, Briefcase, Camera, Bell } as const;

export interface NavTabData {
  key: string;
  label: string;
  href: string;
  icon: keyof typeof ICONS;
  badge?: number;
}

export function BottomNavClient({ tabs }: { tabs: NavTabData[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 w-full max-w-md flex z-30"
      style={{ transform: "translateX(-50%)", background: C.sumi, borderTop: `3px solid ${C.ki}` }}
    >
      {tabs.map((t) => {
        const Icon = ICONS[t.icon];
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link key={t.key} href={t.href} className="flex-1 flex flex-col items-center gap-1 py-2.5 relative">
            {!!t.badge && t.badge > 0 && (
              <span
                className="absolute text-[9px] font-bold px-1.5 rounded-full"
                style={{ background: C.aka, color: "#fff", top: 4, right: "50%", marginRight: -20 }}
              >
                {t.badge}
              </span>
            )}
            <Icon size={18} color={active ? C.ki : "rgba(255,255,255,.55)"} />
            <span className="text-[9px] font-bold whitespace-nowrap" style={{ color: active ? C.ki : "rgba(255,255,255,.55)" }}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
