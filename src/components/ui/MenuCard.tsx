import { C } from "@/styles/tokens";
import type { ReactNode } from "react";

/** MenuRowをまとめるカード。伝票（DenpyoCard）とは違い、設定メニュー用の単純な白カード。 */
export function MenuCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden mb-4 [&>a:last-child]:border-b-0"
      style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 8 }}
    >
      {children}
    </div>
  );
}
