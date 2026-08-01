"use client";

import { C } from "@/styles/tokens";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-[15px] outline-none"
        style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
      />
      {hint && (
        <span className="block text-[11px] mt-1" style={{ color: C.usu }}>
          {hint}
        </span>
      )}
    </label>
  );
}
