"use client";

import { C } from "@/styles/tokens";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function Header({
  title,
  back,
  right,
  onTitle,
}: {
  title: ReactNode;
  back?: () => void;
  right?: ReactNode;
  onTitle?: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 px-3 h-14" style={{ background: C.sumi }}>
      {back && (
        <button onClick={back} className="-ml-1 p-1" aria-label="戻る">
          <ChevronLeft size={22} color="#fff" />
        </button>
      )}
      {onTitle ? (
        <button onClick={onTitle} className="flex-1 min-w-0 text-left">
          <h1 className="text-[16px] font-extrabold truncate flex items-center gap-1" style={{ color: "#fff" }}>
            {title}
            <ChevronRight size={16} style={{ color: C.ki, flexShrink: 0 }} />
          </h1>
        </button>
      ) : (
        <h1 className="text-[17px] font-extrabold flex-1 truncate" style={{ color: "#fff" }}>
          {title}
        </h1>
      )}
      {right}
    </div>
  );
}
