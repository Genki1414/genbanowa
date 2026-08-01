import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { Row } from "@/components/ui/Row";
import { C } from "@/styles/tokens";
import { yen } from "@/domain/shared/money";
import { range } from "@/domain/shared/date";
import type { Order } from "@/domain/transaction/Order";

const KEISHIKI_LABEL = { ukeoi: "請負", ninku: "人工" } as const;

export function OrderCard({
  order,
  showAmount,
  needsMyResponse,
}: {
  order: Order;
  showAmount: boolean;
  /** 自分（受注側）がまだ返事をしていない注文書 */
  needsMyResponse: boolean;
}) {
  const tone = order.rejectedAt ? "usu" : order.acceptedAt ? "midori" : needsMyResponse ? "aka" : "ki";
  const statusLabel = order.rejectedAt ? "差し戻し" : order.acceptedAt ? "請書返送済" : "請書待ち";

  return (
    <DenpyoCard tone={tone}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[13px] font-extrabold" style={{ color: C.sumi }}>
          No.{order.seq}
        </span>
        <Chip color={C.usu}>{KEISHIKI_LABEL[order.keishiki]}</Chip>
        <span className="flex-1" />
        <Chip
          color={order.rejectedAt ? C.usu : order.acceptedAt ? C.midori : needsMyResponse ? C.aka : C.ki}
          solid
        >
          {statusLabel}
        </Chip>
      </div>
      {showAmount &&
        (order.keishiki === "ukeoi" ? (
          <Row label="金額" value={yen(order.amount)} mono />
        ) : (
          <Row label="人工単価" value={`${yen(order.tanka)}／人工`} mono />
        ))}
      <Row label="工期" value={range(order.kokiFrom, order.kokiTo)} mono />
      {order.siteAddress && <Row label="現場" value={order.siteAddress} />}
      {order.note && <Row label="特記" value={order.note} />}
      {order.rejectNote && <Row label="差戻理由" value={order.rejectNote} />}
    </DenpyoCard>
  );
}
