"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { DateRange } from "@/components/ui/DateRange";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { requestAdditionalOrderAction } from "@/app/actions/transaction";

/**
 * 追加工事の依頼。field ロールでも起票できるが、金額は「概算」であり注文書そのものではない
 * （04_権限ロール設計.md：気づいた人がその場で申請できることを優先）。
 */
export function RequestAdditionalOrderForm({ txId }: { txId: string }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [estAmount, setEstAmount] = useState("");
  const [kokiA, setKokiA] = useState("");
  const [kokiB, setKokiB] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Btn tone="ki" onClick={() => setOpen(true)}>
        追加工事を依頼する
      </Btn>
    );
  }

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await requestAdditionalOrderAction(txId, {
        description,
        estAmount: estAmount ? Number(estAmount) : undefined,
        kokiFrom: kokiA || undefined,
        kokiTo: kokiB || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setDescription("");
      setEstAmount("");
      router.refresh();
    });
  };

  return (
    <div className="mt-2">
      <Field label="内容" value={description} onChange={setDescription} placeholder="例）3階部分の追加解体" />
      <Field label="概算金額（任意）" value={estAmount} onChange={setEstAmount} type="number" placeholder="0" />
      <DateRange label="工期（任意）" a={kokiA} b={kokiB} onA={setKokiA} onB={setKokiB} />
      {error && (
        <p className="text-[12px] mb-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={submit} disabled={pending || !description}>
        {pending ? "送信中…" : "この内容で依頼する"}
      </Btn>
    </div>
  );
}
