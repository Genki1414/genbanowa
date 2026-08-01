import { C } from "@/styles/tokens";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";

const DONE = [
  ["Step1", "骨組み（Next.js App Router / TypeScript / Tailwind）"],
  ["Step2", "デザイントークン（src/styles/tokens.ts）"],
  ["Step3", "UI部品（src/components/ui/）"],
  ["Step4", "ドメイン層 checkQuota() / can()（src/domain/plan, src/domain/auth）"],
  ["Step5", "DBスキーマ + RLS + シード（supabase/）"],
  ["Step6", "取引の集約 Transaction（src/domain/transaction）— P1着手"],
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <div className="sticky top-0 z-20 flex items-center px-3 h-14" style={{ background: C.sumi }}>
        <h1 className="text-[17px] font-extrabold" style={{ color: "#fff" }}>ゲンバノワ</h1>
      </div>
      <main className="max-w-md mx-auto p-3">
        <DenpyoCard tone="ki">
          <p className="text-[13px] font-bold" style={{ color: C.sumi }}>
            仕事が見つかって、取った後の書類まで全部ここで終わる。
          </p>
        </DenpyoCard>
        {DONE.map(([step, label]) => (
          <DenpyoCard key={step} tone="midori">
            <div className="flex items-center gap-2">
              <Chip color={C.midori} solid>{step}</Chip>
              <span className="text-[13px]" style={{ color: C.sumi }}>{label}</span>
            </div>
          </DenpyoCard>
        ))}
        <p className="text-[11px] mt-2" style={{ color: C.usu }}>
          画面のルーティング・Supabase連携・Server Actionsはこれから。
        </p>
      </main>
    </div>
  );
}
