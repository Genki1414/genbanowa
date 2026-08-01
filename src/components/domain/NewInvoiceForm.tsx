"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { yen, tax as computeTax } from "@/domain/shared/money";
import { submitInvoiceAction } from "@/app/actions/transaction";

const BASIS_OPTIONS = ["全額", "任意", "人工精算"] as const;
type BasisLabel = (typeof BASIS_OPTIONS)[number];

interface OrderOption {
  id: string;
  seq: number;
  keishiki: "ukeoi" | "ninku";
  amount: number;
  tanka: number;
}

export function NewInvoiceForm({
  txId,
  orders,
  monthlyNinku,
}: {
  txId: string;
  orders: OrderOption[];
  /** 取引全体の月別延べ人工（[YYYY-MM, 人工数]）。人工精算の自動計算に使う。 */
  monthlyNinku: [string, number][];
}) {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const order = orders.find((o) => o.id === orderId);
  const [basisLabel, setBasisLabel] = useState<BasisLabel>("全額");
  const [manualAmount, setManualAmount] = useState("");
  const [month, setMonth] = useState(monthlyNinku[0]?.[0] ?? "");
  const [dueDate, setDueDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [overAmountWarning, setOverAmountWarning] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const basis = basisLabel === "全額" ? "full" : basisLabel === "任意" ? "manual" : "ninku_month";
  const ninkuTotalForMonth = monthlyNinku.find(([m]) => m === month)?.[1] ?? 0;

  const amount = useMemo(() => {
    if (basis === "full") return order?.amount ?? 0;
    if (basis === "ninku_month") return (order?.tanka ?? 0) * ninkuTotalForMonth;
    return Number(manualAmount) || 0;
  }, [basis, order, ninkuTotalForMonth, manualAmount]);

  const tax = computeTax(amount);
  const ready = orderId && dueDate && amount > 0;

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await submitInvoiceAction(txId, {
        orderId,
        amount,
        tax,
        basis,
        dueDate,
        targetMonth: basis === "ninku_month" ? `${month}-01` : undefined,
        ninkuTotal: basis === "ninku_month" ? ninkuTotalForMonth : undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.value.overAmount > 0) {
        setOverAmountWarning(r.value.overAmount);
      }
      router.push(`/transactions/${txId}`);
      router.refresh();
    });
  };

  if (orders.length === 0) {
    return (
      <p className="text-[12px]" style={{ color: C.usu }}>
        請書が返っている注文書がありません。先に注文書の請書返送を待ってください。
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          対象の注文書
        </span>
        <Radio
          options={orders.map((o) => `No.${o.seq}`)}
          value={order ? `No.${order.seq}` : ""}
          onChange={(v) => {
            const found = orders.find((o) => `No.${o.seq}` === v);
            if (found) setOrderId(found.id);
          }}
        />
      </div>
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          請求の根拠
        </span>
        <Radio options={[...BASIS_OPTIONS]} value={basisLabel} onChange={(v) => setBasisLabel(v as BasisLabel)} />
      </div>
      {basis === "manual" && (
        <Field label="請求額（税抜）" value={manualAmount} onChange={setManualAmount} type="number" placeholder="0" />
      )}
      {basis === "ninku_month" && (
        <div className="mb-3">
          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
            対象月
          </span>
          <Radio
            options={monthlyNinku.map(([m]) => m)}
            value={month}
            onChange={setMonth}
          />
          <p className="text-[12px] mt-2" style={{ color: C.usu }}>
            延べ {ninkuTotalForMonth} 人工 × {yen(order?.tanka ?? 0)} = {yen(amount)}
          </p>
        </div>
      )}
      <label className="block mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          支払期日
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 text-[15px] outline-none"
          style={{ background: "#fff", border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
        />
      </label>
      <p className="text-[12px] mb-3" style={{ color: C.usu }}>
        税抜 {yen(amount)}／消費税 {yen(tax)}／合計 {yen(amount + tax)}
      </p>
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {overAmountWarning !== null && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          注文書の金額を {yen(overAmountWarning)} 超えて請求しています。
        </p>
      )}
      <Btn tone="ki" onClick={() => setConfirmOpen(true)} disabled={!ready}>
        この内容で請求する
      </Btn>
      {confirmOpen && (
        <Confirm
          title="請求書を送信します"
          note="送信後は内容を変更できません。"
          doc={{
            name: "請求書",
            rows: [
              ["請求額", yen(amount + tax)],
              ["支払期日", dueDate],
            ],
          }}
          rows={[]}
          okLabel={pending ? "送信中…" : "送信する"}
          onOk={submit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
