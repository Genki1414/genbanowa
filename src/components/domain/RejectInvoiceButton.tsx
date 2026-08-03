"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Field } from "@/components/ui/Field";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { rejectInvoiceAction } from "@/app/actions/transaction";

export function RejectInvoiceButton({ txId, invoiceId }: { txId: string; invoiceId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      const r = await rejectInvoiceAction(txId, invoiceId, note);
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
      <Btn tone="aka" onClick={() => setShowForm(true)}>
        差し戻す
      </Btn>
    );
  }

  return (
    <div>
      <Field label="差し戻す理由" value={note} onChange={setNote} placeholder="例）金額の記載間違い" />
      <Btn tone="aka" onClick={() => setConfirmOpen(true)} disabled={!note}>
        この内容で差し戻す
      </Btn>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {confirmOpen && (
        <Confirm
          title="請求書を差し戻します"
          note="送信後は取り消せません。請求し直す場合は、受注側に新規の請求書を出してもらってください。"
          rows={[["理由", note]]}
          okLabel={pending ? "送信中…" : "差し戻す"}
          onOk={run}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
