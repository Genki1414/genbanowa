"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Field } from "@/components/ui/Field";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { decideDisputeAction } from "@/app/actions/admin";

export function DecideDisputeForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [confirmDecision, setConfirmDecision] = useState<"recorded" | "resolved" | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (decision: "recorded" | "resolved") => {
    startTransition(async () => {
      const r = await decideDisputeAction(disputeId, decision, note || undefined);
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
      <Field label="判断の理由（双方に通知されます）" value={note} onChange={setNote} placeholder="任意" />
      <div className="flex gap-2">
        <Btn tone="aka" onClick={() => setConfirmDecision("recorded")}>
          遅延として記録する
        </Btn>
        <Btn tone="midori" onClick={() => setConfirmDecision("resolved")}>
          遅延ではないと判断する
        </Btn>
      </div>
      {error && (
        <p className="text-[12px] mt-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {confirmDecision && (
        <Confirm
          title={confirmDecision === "recorded" ? "遅延として記録します" : "遅延ではないと判断します"}
          note="この判断は双方に通知され、取り消せません。再審査は別途申請できます。"
          rows={note ? [["理由", note]] : []}
          okLabel={pending ? "送信中…" : "この内容で確定する"}
          onOk={() => run(confirmDecision)}
          onCancel={() => setConfirmDecision(null)}
        />
      )}
    </div>
  );
}
