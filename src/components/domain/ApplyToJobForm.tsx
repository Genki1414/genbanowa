"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { applyToJobAction } from "@/app/actions/job";

export function ApplyToJobForm({ jobId }: { jobId: string }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await applyToJobAction(jobId, amount ? Number(amount) : undefined, message);
      if (!r.ok) {
        setConfirmOpen(false);
        setError(r.error);
        return;
      }
      router.push(`/messages/${r.value.conversationId}`);
      router.refresh();
    });
  };

  return (
    <div>
      <Field label="希望金額（税抜・任意）" value={amount} onChange={setAmount} type="number" placeholder="応相談なら空欄" />
      <Field label="メッセージ" value={message} onChange={setMessage} placeholder="例）対応可能です。詳細を教えてください" />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={() => setConfirmOpen(true)} disabled={!message.trim()}>
        この案件に応募する
      </Btn>
      {confirmOpen && (
        <Confirm
          title="この案件に応募します"
          note="応募すると、この会社とのやり取りが始まります。"
          rows={[["メッセージ", message]]}
          okLabel={pending ? "送信中…" : "応募する"}
          onOk={submit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
