import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Row } from "@/components/ui/Row";
import { TxStatusChip } from "@/components/domain/TxStatusChip";
import { OrderCard } from "@/components/domain/OrderCard";
import { OrderRequestCard } from "@/components/domain/OrderRequestCard";
import { InvoiceCard } from "@/components/domain/InvoiceCard";
import { ReportList } from "@/components/domain/ReportList";
import { SimpleActionButton } from "@/components/domain/SimpleActionButton";
import { RejectOrderButton } from "@/components/domain/RejectOrderButton";
import { ConfirmReceiptButton } from "@/components/domain/ConfirmReceiptButton";
import { RequestAdditionalOrderForm } from "@/components/domain/RequestAdditionalOrderForm";
import { AssignmentManager } from "@/components/domain/AssignmentManager";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTransaction } from "@/lib/supabase/transactionRepo";
import { canSeeAmount } from "@/domain/auth/Role";
import { can } from "@/domain/auth/Permission";
import { transactionDisplayStatus } from "@/domain/transaction/Transaction";
import { isPending } from "@/domain/transaction/Order";
import { yen } from "@/domain/shared/money";
import { fmt } from "@/domain/shared/date";
import {
  acceptOrderAction,
  approveInvoiceAction,
  registerPaymentAction,
  requestCompletionAction,
  approveCompletionAction,
} from "@/app/actions/transaction";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const tx = await loadTransaction(supabase, id);
  if (!tx) notFound();

  const side = actor.companyId === tx.motoCompanyId ? "moto" : actor.companyId === tx.ukeCompanyId ? "uke" : null;
  if (!side) notFound();

  const showAmount = canSeeAmount(actor.role);
  const stripped = tx.stripAmounts(actor.role);
  const actions = tx.availableActions(actor);

  const partnerCompanyId = side === "moto" ? tx.ukeCompanyId : tx.motoCompanyId;
  const { data: partner } = await supabase.from("companies").select("name").eq("id", partnerCompanyId).maybeSingle();

  const canManageAssignment = can(actor.role, "assignment.manage");
  let fieldUsers: { id: string; name: string }[] = [];
  let assignedUserIds: string[] = [];
  if (canManageAssignment) {
    const [{ data: fieldUserRows }, { data: assignmentRows }] = await Promise.all([
      supabase.from("users").select("id, name").eq("company_id", actor.companyId).eq("role", "field"),
      supabase.from("site_assignments").select("user_id").eq("transaction_id", id),
    ]);
    fieldUsers = fieldUserRows ?? [];
    const assignedIdSet = new Set((assignmentRows ?? []).map((a) => a.user_id));
    assignedUserIds = fieldUsers.filter((u) => assignedIdSet.has(u.id)).map((u) => u.id);
  }

  const displayStatus = transactionDisplayStatus(tx.status, tx.orders);
  const canIssueOrder = actions.includes("order.issue");
  const canReport = actions.includes("report.write");
  const canInvoice = actions.includes("invoice.create");
  const canRequestAdditional = actions.includes("order.requestAdditional");
  const canRequestCompletion = actions.includes("completion.request");
  const canApproveCompletion = actions.includes("completion.approve");

  return (
    <div className="min-h-screen pb-10" style={{ background: C.yojo }}>
      <BackHeader title={tx.title} />
      <main className="max-w-md mx-auto p-3">
        <DenpyoCard tone="plain">
          <div className="flex items-center gap-2 mb-1">
            <TxStatusChip status={displayStatus} />
            <span className="flex-1" />
          </div>
          <Row label="相手" value={partner?.name ?? "—"} />
          <Row label="立場" value={side === "moto" ? "発注側" : "受注側"} />
          {stripped.closingDay && <Row label="締め日" value={stripped.closingDay} />}
          {stripped.paymentTerms && <Row label="支払日" value={stripped.paymentTerms} />}
        </DenpyoCard>

        {canManageAssignment && (
          <>
            <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
              現場担当の割り当て
            </h2>
            <AssignmentManager txId={id} fieldUsers={fieldUsers} assignedUserIds={assignedUserIds} />
          </>
        )}

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          注文書
        </h2>
        {stripped.orders.map((order) => {
          const needsMyResponse = side === "uke" && isPending(order) && actions.includes("order.accept");
          return (
            <div key={order.id}>
              <OrderCard order={order} showAmount={showAmount} needsMyResponse={needsMyResponse} />
              {needsMyResponse && (
                <div className="flex gap-2 mb-3 -mt-2">
                  <SimpleActionButton
                    label="請書を返す"
                    tone="midori"
                    confirmTitle="注文請書を返送します"
                    confirmNote="送信後は取り消せません。"
                    confirmRows={[["注文書", `No.${order.seq}`]]}
                    action={() => acceptOrderAction(id, order.id)}
                  />
                  <RejectOrderButton txId={id} orderId={order.id} orderLabel={`No.${order.seq}`} />
                </div>
              )}
            </div>
          );
        })}
        {canIssueOrder && (
          <Link href={`/transactions/${id}/orders/new`} className="block text-[12px] font-bold underline mb-3" style={{ color: C.sumi }}>
            + 注文書を追加する
          </Link>
        )}

        {(stripped.orderRequests.length > 0 || canRequestAdditional) && (
          <>
            <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
              追加工事の依頼
            </h2>
            {stripped.orderRequests.map((request) => (
              <OrderRequestCard
                key={request.id}
                txId={id}
                request={request}
                showAmount={showAmount}
                canIssue={canIssueOrder}
              />
            ))}
            {canRequestAdditional && <RequestAdditionalOrderForm txId={id} />}
          </>
        )}

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          作業日報
        </h2>
        <ReportList reports={stripped.dailyReports} />
        {canReport && (
          <Link href={`/transactions/${id}/reports/new`} className="block text-[12px] font-bold underline mt-2 mb-3" style={{ color: C.sumi }}>
            + 日報を書く
          </Link>
        )}

        <h2 className="text-[13px] font-extrabold mt-4 mb-2" style={{ color: C.sumi }}>
          請求
        </h2>
        {stripped.invoices.map((invoice) => (
          <div key={invoice.id}>
            <InvoiceCard invoice={invoice} showAmount={showAmount} />
            <div className="flex gap-2 mb-3 -mt-2">
              {invoice.status === "submitted" && actions.includes("invoice.approve") && (
                <SimpleActionButton
                  label="請求を承認する"
                  tone="midori"
                  confirmTitle="請求を承認します"
                  confirmRows={showAmount ? [["請求額", yen(invoice.amount + invoice.tax)]] : []}
                  action={() => approveInvoiceAction(id, invoice.id)}
                />
              )}
              {invoice.status === "approved" && actions.includes("payment.register") && (
                <SimpleActionButton
                  label="支払を登録する"
                  tone="midori"
                  confirmTitle="支払を登録します"
                  confirmNote="実際に振込・送金した後に登録してください。"
                  confirmRows={[["期日", fmt(invoice.dueDate)]]}
                  action={() => registerPaymentAction(id, invoice.id)}
                />
              )}
              {invoice.status === "paid" && actions.includes("receipt.confirm") && (
                <ConfirmReceiptButton txId={id} invoiceId={invoice.id} dueDate={invoice.dueDate} />
              )}
            </div>
          </div>
        ))}
        {canInvoice && (
          <Link href={`/transactions/${id}/invoices/new`} className="block text-[12px] font-bold underline mb-3" style={{ color: C.sumi }}>
            + 請求書を作る
          </Link>
        )}

        {(canRequestCompletion || canApproveCompletion) && (
          <div className="mt-4">
            {canRequestCompletion && (
              <SimpleActionButton
                label="取引完了を申請する"
                tone="ki"
                confirmTitle="取引の完了を申請します"
                confirmRows={[["工事名", tx.title]]}
                action={() => requestCompletionAction(id)}
              />
            )}
            {canApproveCompletion && (
              <SimpleActionButton
                label="取引完了を承認する"
                tone="midori"
                confirmTitle="取引の完了を承認します"
                confirmNote="承認すると、双方の信用スコアに反映されます。"
                confirmRows={[["工事名", tx.title]]}
                action={() => approveCompletionAction(id)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
