"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { bootstrapCompanyAction } from "@/app/actions/auth";
import { C } from "@/styles/tokens";

const TYPE_LABEL: Record<string, "corp" | "sole"> = { 法人: "corp", 個人事業主: "sole" };

export function CompanyBootstrapForm() {
  const [name, setName] = useState("");
  const [typeLabel, setTypeLabel] = useState("法人");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await bootstrapCompanyAction(name, TYPE_LABEL[typeLabel], userName);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div>
      <Field label="会社名" value={name} onChange={setName} placeholder="例）高橋工業" />
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          法人区分
        </span>
        <Radio options={["法人", "個人事業主"]} value={typeLabel} onChange={setTypeLabel} />
      </div>
      <Field label="あなたの氏名" value={userName} onChange={setUserName} placeholder="例）高橋 一郎" />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={submit} disabled={pending || !name || !userName}>
        {pending ? "登録中…" : "この内容で登録する"}
      </Btn>
    </div>
  );
}
