import { C, FONT, MONO } from "@/styles/tokens";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-[3px]">
      {Icon && <Icon size={13} style={{ color: C.usu, marginTop: 3, flexShrink: 0 }} />}
      <span className="text-[12px] w-16 flex-shrink-0" style={{ color: C.usu }}>
        {label}
      </span>
      <span
        className="text-[13px] font-medium"
        style={{ color: C.sumi, fontFamily: mono ? MONO : FONT, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
  );
}
