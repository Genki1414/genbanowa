"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { withdrawAvailabilityAction } from "@/app/actions/job";

export function WithdrawAvailabilityButton({ id }: { id: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      const r = await withdrawAvailabilityAction(id);
      setConfirmOpen(false);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <Btn tone="aka" onClick={() => setConfirmOpen(true)}>
        取り下げる
      </Btn>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {confirmOpen && (
        <Confirm
          title="空き情報を取り下げます"
          note="一覧から見えなくなります。"
          rows={[]}
          okLabel={pending ? "送信中…" : "取り下げる"}
          onOk={run}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
