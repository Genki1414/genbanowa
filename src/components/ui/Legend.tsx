"use client";

import { C } from "@/styles/tokens";

export function Legend({
  items,
  open,
  onClick,
}: {
  items: [string, string][];
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div className="mb-3">
      <button onClick={onClick} className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: C.usu }}>
        <span className="flex gap-[3px]">
          {items.map(([c], i) => (
            <span key={i} className="rounded-sm" style={{ width: 10, height: 10, background: c }} />
          ))}
        </span>
        色の意味 {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2 p-2 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          {items.map(([c, label], i) => (
            <div key={i} className="flex items-center gap-2 py-[3px]">
              <span className="rounded-sm flex-shrink-0" style={{ width: 12, height: 12, background: c }} />
              <span className="text-[12px]" style={{ color: C.sumi }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
