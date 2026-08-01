import { C } from "@/styles/tokens";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

/**
 * プラン制限の表示。okがfalseの間は施錠された案内を出す。
 * 判定そのものはここでは行わない — checkQuota() / can() の結果を渡すだけ。
 */
export function Gate({ ok, need, children }: { ok: boolean; need: string; children: ReactNode }) {
  if (ok) return children;
  return (
    <div className="flex items-center gap-2 py-4 px-3 rounded-sm" style={{ background: C.yojo, border: `1px dashed ${C.keisen}` }}>
      <Lock size={16} style={{ color: C.usu, flexShrink: 0 }} />
      <span className="text-[12px]" style={{ color: C.usu }}>
        {need}プラン以上で表示されます
      </span>
    </div>
  );
}
