"use client";

import { boardLines, BoardData } from "./blackboard";

export function BoardOverlay({ b }: { b: BoardData }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: "3%", bottom: "3.5%", width: "54%", background: "#1E3A2F", border: "2px solid #E8E3D3", padding: "6px 8px" }}
    >
      {boardLines(b).map(([k, v], i) => (
        <div key={i} className="flex gap-1" style={{ lineHeight: 1.5 }}>
          <span className="text-[9px] font-bold" style={{ color: "#B9CFC2", width: "34%" }}>
            {k}
          </span>
          <span className="text-[9px] font-bold truncate" style={{ color: "#F2EFE4" }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}
