"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/styles/tokens";

const TABS = [
  { href: "/admin/disputes", label: "入金確認・異議申立" },
  { href: "/admin/trust-documents", label: "信用書類" },
] as const;

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-14 z-10 flex items-center gap-1 px-3 py-2" style={{ background: C.kami, borderBottom: `1px solid ${C.keisen}` }}>
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="px-2.5 py-1 text-[12px] font-bold rounded-full"
            style={active ? { background: C.sumi, color: "#fff" } : { background: C.yojo, color: C.usu }}
          >
            {t.label}
          </Link>
        );
      })}
      <span className="flex-1" />
      <Link href="/me/members" className="text-[11px] underline" style={{ color: C.usu }}>
        通常画面に戻る
      </Link>
    </div>
  );
}
