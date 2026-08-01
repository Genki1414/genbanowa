import { C } from "@/styles/tokens";
import type { ReactNode } from "react";

type Tone = "plain" | "ki" | "midori" | "aka" | "usu";

/**
 * 伝票カード。左端のミシン目が「これは伝票です」という合図になっている。
 * 業界の人に一発で伝わるための意匠なので、削らないこと。
 */
export function DenpyoCard({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const bar = { plain: C.keisen, ki: C.ki, midori: C.midori, aka: C.aka, usu: C.usu }[tone];
  return (
    <div
      className="relative overflow-hidden mb-3"
      style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 6 }}
    >
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 10, background: bar }} />
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: 10,
          width: 8,
          backgroundImage: `radial-gradient(circle at 4px 5px, ${C.yojo} 2.2px, transparent 2.4px)`,
          backgroundSize: "8px 11px",
        }}
      />
      <div style={{ paddingLeft: 26 }} className="pr-3 py-3">
        {children}
      </div>
    </div>
  );
}
