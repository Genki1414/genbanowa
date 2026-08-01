import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Row } from "@/components/ui/Row";
import { C } from "@/styles/tokens";
import { fmt } from "@/domain/shared/date";
import type { DailyReport } from "@/domain/transaction/DailyReport";

/** 作業日報の一覧。人数は field ロールにも常に見せる（金額の秘匿と無関係）。 */
export function ReportList({ reports }: { reports: DailyReport[] }) {
  if (reports.length === 0) {
    return (
      <p className="text-[12px]" style={{ color: C.usu }}>
        日報はまだありません。
      </p>
    );
  }
  return (
    <>
      {[...reports]
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .map((r) => (
          <DenpyoCard key={r.id} tone="plain">
            <Row label="日付" value={fmt(r.workDate)} mono />
            <Row label="人数" value={`${r.headcount}人`} mono />
            <Row label="内容" value={r.content} />
            {r.note && <Row label="備考" value={r.note} />}
          </DenpyoCard>
        ))}
    </>
  );
}
