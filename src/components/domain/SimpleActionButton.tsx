"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { Result } from "@/domain/shared/result";

type Tone = "sumi" | "ki" | "midori" | "aka";

/** 1クリックで完結する取引アクション（請書を返す・承認・支払登録・完了申請/承認など）の共通UI。 */
export function SimpleActionButton({
  label,
  tone = "midori",
  confirmTitle,
  confirmNote,
  confirmRows,
  action,
}: {
  label: string;
  tone?: Tone;
  confirmTitle: string;
  confirmNote?: string;
  confirmRows: [string, string][];
  action: () => Promise<Result<unknown>>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        // 確認モーダルを閉じないと、下のエラーメッセージがモーダルの裏に隠れて見えない
        setOpen(false);
        setError(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Btn tone={tone} onClick={() => setOpen(true)}>
        {label}
      </Btn>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {open && (
        <Confirm
          title={confirmTitle}
          note={confirmNote}
          rows={confirmRows}
          okLabel={pending ? "送信中…" : label}
          onOk={run}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
