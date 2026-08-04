"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { addPartnerAction } from "@/app/actions/partner";

export function AddPartnerForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await addPartnerAction({
        name,
        contactName: contactName || undefined,
        closingDay: closingDay || undefined,
        paymentTerms: paymentTerms || undefined,
        email: email || undefined,
        tel: tel || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setName("");
      setContactName("");
      setClosingDay("");
      setPaymentTerms("");
      setEmail("");
      setTel("");
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-3 py-2.5 rounded-sm text-[13px] font-extrabold"
        style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.sumi}` }}
      >
        + 取引先を登録する
      </button>
    );
  }

  return (
    <div className="mb-3 p-3 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
      <Field label="取引先名" value={name} onChange={setName} placeholder="例）〇〇建設" />
      <Field label="担当者（任意）" value={contactName} onChange={setContactName} />
      <Field label="締め日（任意）" value={closingDay} onChange={setClosingDay} placeholder="例）末日" />
      <Field label="支払日（任意）" value={paymentTerms} onChange={setPaymentTerms} placeholder="例）翌月末" />
      <Field label="メール（任意）" value={email} onChange={setEmail} type="email" />
      <Field label="電話番号（任意）" value={tel} onChange={setTel} />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Btn tone="ki" onClick={submit} disabled={pending || !name.trim()}>
          {pending ? "登録中…" : "登録する"}
        </Btn>
      </div>
      <button onClick={() => setOpen(false)} className="text-[11px] mt-2 underline" style={{ color: C.usu }}>
        やめる
      </button>
    </div>
  );
}
