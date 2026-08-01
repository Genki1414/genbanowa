"use client";

import { C } from "@/styles/tokens";
import type { ReactNode } from "react";

type Tone = "sumi" | "ki" | "midori" | "aka";

export function Btn({
  children,
  onClick,
  tone = "sumi",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  disabled?: boolean;
}) {
  const bg = { sumi: C.sumi, ki: C.ki, midori: C.midori, aka: C.aka }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 text-[15px] font-extrabold rounded-sm disabled:opacity-40"
      style={{ background: bg, color: tone === "ki" ? C.sumi : "#fff" }}
    >
      {children}
    </button>
  );
}
