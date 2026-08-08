"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Field } from "@/components/ui/Field";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { approveTrustDocumentAction, rejectTrustDocumentAction } from "@/app/actions/admin";

export function DecideTrustDocumentForm({ docId }: { docId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [confirmDecision, setConfirmDecision] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (decision: "approve" | "reject") => {
    startTransition(async () => {
      const r = decision === "approve" ? await approveTrustDocumentAction(docId) : await rejectTrustDocumentAction(docId, note || undefined);
      setConfirmDecision(null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <Field label="却下理由（本人に通知されます）" value={note} onChange={setNote} placeholder="例）許可番号の形式が正しくありません" />
      <div className="flex gap-2">
        <Btn tone="midori" onClick={() => setConfirmDecision("approve")}>
          承認する
        </Btn>
        <Btn tone="aka" onClick={() => setConfirmDecision("reject")} disabled={!note.trim()}>
          却下する
        </Btn>
      </div>
      {!note.trim() && (
        <p className="text-[11px] mt-1" style={{ color: C.usu }}>
          却下するには理由の入力が必要です。
        </p>
      )}
      {error && (
        <p className="text-[12px] mt-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {confirmDecision && (
        <Confirm
          title={confirmDecision === "approve" ? "この書類を承認します" : "この書類を却下します"}
          note={
            confirmDecision === "approve"
              ? "承認すると内容が会社プロフィールに反映され、信用スコアに加点されます。"
              : "却下すると本人に理由が通知され、再提出できるようになります。"
          }
          rows={note ? [["理由", note]] : []}
          okLabel={pending ? "送信中…" : "この内容で確定する"}
          onOk={() => run(confirmDecision)}
          onCancel={() => setConfirmDecision(null)}
        />
      )}
    </div>
  );
}
