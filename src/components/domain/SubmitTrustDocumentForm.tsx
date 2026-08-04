"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { submitTrustDocumentAction } from "@/app/actions/company";
import { TrustDocKind } from "@/lib/supabase/database.types";

const NEEDS_VALUE: TrustDocKind[] = ["invoice", "ccus", "hp"];

export function SubmitTrustDocumentForm({ kind, label }: { kind: TrustDocKind; label: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const needsValue = NEEDS_VALUE.includes(kind);

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await submitTrustDocumentAction(kind, value || undefined);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] font-bold underline flex-shrink-0" style={{ color: C.sumi }}>
        提出する
      </button>
    );
  }

  return (
    <div className="w-full mt-2">
      {needsValue && (
        <Field
          label={label}
          value={value}
          onChange={setValue}
          placeholder={kind === "invoice" ? "T1234567890123" : kind === "ccus" ? "事業者ID" : "https://"}
        />
      )}
      {!needsValue && (
        <p className="text-[11px] mb-2" style={{ color: C.usu }}>
          ファイルの添付は今後対応予定です。ひとまず提出申請だけ記録します（運営の確認をもって承認されます）。
        </p>
      )}
      {error && (
        <p className="text-[12px] mb-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Btn tone="ki" onClick={submit} disabled={pending || (needsValue && !value)}>
          {pending ? "送信中…" : "提出する"}
        </Btn>
      </div>
      <button onClick={() => setOpen(false)} className="text-[11px] mt-1 underline" style={{ color: C.usu }}>
        やめる
      </button>
    </div>
  );
}
