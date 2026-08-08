import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { C } from "@/styles/tokens";

export function MenuRow({ href, icon: Icon, label, tone = "sumi" }: { href: string; icon: LucideIcon; label: string; tone?: "sumi" | "ki" }) {
  const color = tone === "ki" ? C.ki : C.sumi;
  return (
    <Link href={href} className="flex items-center gap-3 py-3 px-3" style={{ borderBottom: `1px dashed ${C.keisen}` }}>
      <Icon size={18} style={{ color, flexShrink: 0 }} />
      <span className="flex-1 text-[14px] font-bold" style={{ color: C.sumi }}>
        {label}
      </span>
      <ChevronRight size={16} style={{ color: C.usu, flexShrink: 0 }} />
    </Link>
  );
}
