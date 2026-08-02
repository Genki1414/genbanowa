"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { fmt } from "@/domain/shared/date";
import { confirmReceiptAction } from "@/app/actions/transaction";

export function ConfirmReceiptButton({ txId, invoiceId, dueDate }: { txId: string; invoiceId: string; dueDate: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [showForm, setShowForm] = useState(false);
  const [receivedOn, setReceivedOn] = useState(today);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      const r = await confirmReceiptAction(txId, invoiceId, receivedOn);
      setConfirmOpen(false);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  if (!showForm) {
    return (
      <Btn tone="midori" onClick={() => setShowForm(true)}>
        入金を確認する
      </Btn>
    );
  }

  const ontime = receivedOn <= dueDate;

  return (
    <div>
      <label className="block mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          入金日
        </span>
        <input
          type="date"
          value={receivedOn}
          onChange={(e) => setReceivedOn(e.target.value)}
          className="w-full px-3 py-2 text-[15px] outline-none"
          style={{ background: "#fff", border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
        />
      </label>
      <Btn tone="midori" onClick={() => setConfirmOpen(true)}>
        この内容で確認する
      </Btn>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {confirmOpen && (
        <Confirm
          title="入金を確認します"
          note={ontime ? "期日内の入金として記録されます。" : "期日を過ぎていますが、そのまま記録できます。"}
          rows={[
            ["入金日", fmt(receivedOn)],
            ["期日", fmt(dueDate)],
            ["判定", ontime ? "期日内" : "期日超過"],
          ]}
          okLabel={pending ? "送信中…" : "確認する"}
          onOk={run}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
