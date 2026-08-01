"use client";

import { C } from "@/styles/tokens";

export function DateRange({
  label,
  a,
  b,
  onA,
  onB,
}: {
  label: string;
  a: string;
  b: string;
  onA: (value: string) => void;
  onB: (value: string) => void;
}) {
  return (
    <div className="mb-3">
      <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={a}
          onChange={(e) => onA(e.target.value)}
          className="flex-1 px-2 py-2 text-[14px] outline-none"
          style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
        />
        <span className="text-[13px]" style={{ color: C.usu }}>
          〜
        </span>
        <input
          type="date"
          value={b}
          onChange={(e) => onB(e.target.value)}
          className="flex-1 px-2 py-2 text-[14px] outline-none"
          style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
        />
      </div>
    </div>
  );
}
