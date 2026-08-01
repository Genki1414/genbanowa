import { C } from "@/styles/tokens";
import type { ReactNode } from "react";

export function Chip({
  children,
  color = C.usu,
  solid = false,
}: {
  children: ReactNode;
  color?: string;
  solid?: boolean;
}) {
  return (
    <span
      className="inline-block text-[11px] px-2 py-[3px] rounded-sm font-bold"
      style={{
        color: solid ? "#fff" : color,
        background: solid ? color : "transparent",
        border: solid ? "none" : `1px solid ${color}`,
      }}
    >
      {children}
    </span>
  );
}
