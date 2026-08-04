"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { C } from "@/styles/tokens";
import { Pills } from "@/components/ui/Pills";

interface Filters {
  q: string;
  area: string;
  industry: string;
}

export function AvailabilityFilterBar({
  areas,
  industries,
  initial,
}: {
  areas: string[];
  industries: string[];
  initial: Filters;
}) {
  const router = useRouter();
  const hasFilter = !!initial.q || initial.area !== "すべて" || initial.industry !== "すべて";
  const [open, setOpen] = useState(hasFilter);
  const [qInput, setQInput] = useState(initial.q);

  const push = (next: Partial<Filters>) => {
    const merged = { ...initial, q: qInput, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.area !== "すべて") params.set("area", merged.area);
    if (merged.industry !== "すべて") params.set("industry", merged.industry);
    router.push(`/availabilities?${params.toString()}`);
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm"
        style={{ background: open || hasFilter ? C.ki : C.kami, border: `1px solid ${open || hasFilter ? C.ki : C.keisen}` }}
      >
        <SlidersHorizontal size={14} color={C.sumi} />
        <span className="text-[12px] font-bold" style={{ color: C.sumi }}>
          絞り込み{hasFilter ? "中" : ""}
        </span>
      </button>

      {open && (
        <div className="p-3 mt-2 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
          <div className="flex gap-2 mb-3">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && push({})}
              placeholder="会社名・地名・工種"
              className="flex-1 px-3 py-2 text-[15px] outline-none"
              style={{ border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
            />
            <button
              onClick={() => push({})}
              className="px-4 rounded-sm flex items-center gap-1.5 text-[13px] font-extrabold"
              style={{ background: C.sumi, color: "#fff" }}
            >
              <Search size={15} />
              検索
            </button>
          </div>
          {initial.q && (
            <button
              onClick={() => {
                setQInput("");
                push({ q: "" });
              }}
              className="flex items-center gap-1 text-[12px] font-bold mb-2"
              style={{ color: C.aka }}
            >
              <X size={13} />「{initial.q}」の検索を解除
            </button>
          )}
          <div className="mb-2">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
              エリア
            </span>
            <Pills options={areas} value={initial.area} onChange={(v) => push({ area: v })} />
          </div>
          <div>
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
              工種
            </span>
            <Pills options={industries} value={initial.industry} onChange={(v) => push({ industry: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
