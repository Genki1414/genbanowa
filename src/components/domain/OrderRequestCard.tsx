import Link from "next/link";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { Row } from "@/components/ui/Row";
import { C } from "@/styles/tokens";
import { yen } from "@/domain/shared/money";
import type { OrderRequest } from "@/domain/transaction/OrderRequest";

const STATUS_LABEL: Record<OrderRequest["status"], string> = {
  requested: "依頼中",
  issued: "注文書発行済",
  declined: "見送り",
};

export function OrderRequestCard({
  txId,
  request,
  showAmount,
  canIssue,
}: {
  txId: string;
  request: OrderRequest;
  showAmount: boolean;
  /** 発注側で、まだ注文書化されていない依頼にだけ発行導線を出す */
  canIssue: boolean;
}) {
  return (
    <DenpyoCard tone={request.status === "requested" ? "ki" : request.status === "issued" ? "midori" : "usu"}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
          追加工事の依頼
        </span>
        <span className="flex-1" />
        <Chip color={C.usu}>{STATUS_LABEL[request.status]}</Chip>
      </div>
      <Row label="内容" value={request.description} />
      {showAmount && request.estAmount > 0 && <Row label="概算" value={yen(request.estAmount)} mono />}
      {canIssue && request.status === "requested" && (
        <Link
          href={`/transactions/${txId}/orders/new?fulfillsRequestId=${request.id}&description=${encodeURIComponent(
            request.description,
          )}&estAmount=${request.estAmount}`}
          className="block mt-2 text-[12px] font-bold underline"
          style={{ color: C.sumi }}
        >
          この内容で注文書を出す
        </Link>
      )}
    </DenpyoCard>
  );
}
