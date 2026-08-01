"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { addReportAction } from "@/app/actions/transaction";

export function NewReportForm({ txId }: { txId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [workDate, setWorkDate] = useState(today);
  const [headcount, setHeadcount] = useState("");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await addReportAction(txId, {
        workDate,
        headcount: Number(headcount),
        content,
        note: note || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/transactions/${txId}`);
      router.refresh();
    });
  };

  return (
    <div>
      <label className="block mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          日付
        </span>
        <input
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          className="w-full px-3 py-2 text-[15px] outline-none"
          style={{ background: "#fff", border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
        />
      </label>
      <Field label="人数" value={headcount} onChange={setHeadcount} type="number" placeholder="0" />
      <Field label="作業内容" value={content} onChange={setContent} placeholder="例）北面の建地建て込み" />
      <Field label="備考（任意）" value={note} onChange={setNote} placeholder="例）晴れ" />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={submit} disabled={pending || !workDate || !headcount || !content}>
        {pending ? "送信中…" : "この内容で日報を書く"}
      </Btn>
    </div>
  );
}
