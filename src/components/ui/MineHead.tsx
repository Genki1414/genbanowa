"use client";

import { C } from "@/styles/tokens";

export function MineHead({
  open,
  n,
  onClick,
  label,
}: {
  open: boolean;
  n: number;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-sm"
      style={{ background: C.sumi }}
    >
      <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>
        {label}
      </span>
      <span className="text-[11px] font-bold px-1.5 py-[2px] rounded-sm" style={{ background: C.ki, color: C.sumi }}>
        {n}件
      </span>
      <span className="flex-1" />
      <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>
        {open ? "▲" : "▼"}
      </span>
    </button>
  );
}
