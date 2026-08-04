"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { C } from "@/styles/tokens";

/** 自社の投稿だけをまとめた折りたたみセクション。プロトタイプのMineHeadと同じ見た目。 */
export function MineSection({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-sm"
        style={{ background: C.sumi }}
      >
        <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>
          {label}
        </span>
        <span className="text-[11px] font-bold px-1.5 py-[2px] rounded-sm" style={{ background: C.ki, color: C.sumi }}>
          {count}件
        </span>
        <span className="flex-1" />
        <span className="text-[13px] font-extrabold" style={{ color: C.ki }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && children}
    </div>
  );
}
