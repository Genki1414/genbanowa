"use client";

import { C } from "@/styles/tokens";

export function Pills({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="text-[12px] px-2.5 py-1 rounded-sm font-bold"
          style={{
            background: value === o ? C.sumi : C.kami,
            color: value === o ? "#fff" : C.usu,
            border: `1px solid ${value === o ? C.sumi : C.keisen}`,
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
