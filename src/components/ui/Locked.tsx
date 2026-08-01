"use client";

import { C } from "@/styles/tokens";
import { Lock } from "lucide-react";

export function Locked({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex items-center gap-2 w-full text-left py-[3px]">
      <Lock size={13} style={{ color: C.usu, flexShrink: 0 }} />
      <span className="text-[12px] w-16 flex-shrink-0" style={{ color: C.usu }}>
        {label}
      </span>
      <span
        className="text-[12px] font-bold px-2 py-[2px] rounded-sm"
        style={{ background: C.ki, color: C.sumi }}
      >
        有料プランで表示
      </span>
    </button>
  );
}
