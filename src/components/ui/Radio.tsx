"use client";

import { C } from "@/styles/tokens";

export function Radio({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="py-2.5 text-[13px] font-extrabold rounded-sm flex items-center justify-center gap-1.5"
          style={{
            background: value === o ? C.ki : C.kami,
            color: C.sumi,
            border: `1px solid ${value === o ? C.ki : C.keisen}`,
          }}
        >
          <span
            className="rounded-full flex items-center justify-center"
            style={{ width: 15, height: 15, border: `2px solid ${value === o ? C.sumi : C.keisen}` }}
          >
            {value === o && <span className="rounded-full" style={{ width: 7, height: 7, background: C.sumi }} />}
          </span>
          {o}
        </button>
      ))}
    </div>
  );
}
