import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { Row } from "@/components/ui/Row";
import { C } from "@/styles/tokens";
import { yen } from "@/domain/shared/money";
import { fmt } from "@/domain/shared/date";
import { isPaidOnTime } from "@/domain/transaction/Invoice";
import type { Invoice } from "@/domain/transaction/Invoice";

const STATUS_LABEL: Record<Invoice["status"], string> = {
  submitted: "提出済",
  approved: "承認済",
  paid: "支払済",
  received: "入金済",
  rejected: "却下",
};

const STATUS_TONE: Record<Invoice["status"], "usu" | "ki" | "midori" | "aka"> = {
  submitted: "ki",
  approved: "ki",
  paid: "ki",
  received: "midori",
  rejected: "usu",
};

export function InvoiceCard({ invoice, showAmount }: { invoice: Invoice; showAmount: boolean }) {
  const ontime = invoice.status === "received" ? isPaidOnTime(invoice) : null;

  return (
    <DenpyoCard tone={STATUS_TONE[invoice.status]}>
      <div className="flex items-center gap-2 mb-1">
        <Chip color={{ usu: C.usu, ki: C.ki, midori: C.midori, aka: C.aka }[STATUS_TONE[invoice.status]]} solid>
          {STATUS_LABEL[invoice.status]}
        </Chip>
        {ontime !== null && (
          <Chip color={ontime ? C.midori : C.usu}>{ontime ? "期日内" : "期日超過"}</Chip>
        )}
      </div>
      {showAmount && <Row label="請求額" value={yen(invoice.amount + invoice.tax)} mono />}
      <Row label="期日" value={fmt(invoice.dueDate)} mono />
      {invoice.receivedOn && <Row label="入金日" value={fmt(invoice.receivedOn)} mono />}
    </DenpyoCard>
  );
}
