"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { yen, tax as computeTax } from "@/domain/shared/money";
import { issueStandaloneDocumentAction } from "@/app/actions/partner";

const KIND_OPTIONS = ["見積書", "注文書", "請求書"] as const;
const KIND_MAP = { 見積書: "estimate", 注文書: "order", 請求書: "invoice" } as const;

export function IssueStandaloneDocumentForm({ partnerId }: { partnerId: string }) {
  const [kindLabel, setKindLabel] = useState<(typeof KIND_OPTIONS)[number]>("見積書");
  const [title, setTitle] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [koki, setKoki] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const kind = KIND_MAP[kindLabel];
  const amountNum = Number(amount) || 0;
  const tax = computeTax(amountNum);
  const ready = title.trim() && amountNum > 0;

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await issueStandaloneDocumentAction({
        partnerId,
        kind,
        title,
        siteAddress: siteAddress || undefined,
        koki: koki || undefined,
        amount: amountNum,
        tax,
      });
      if (!r.ok) {
        setConfirmOpen(false);
        setError(r.error);
        return;
      }
      router.push(`/partners/${partnerId}`);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          書類の種類
        </span>
        <Radio options={[...KIND_OPTIONS]} value={kindLabel} onChange={(v) => setKindLabel(v as (typeof KIND_OPTIONS)[number])} />
      </div>
      <Field label="工事名・件名" value={title} onChange={setTitle} placeholder="例）〇〇邸 外壁塗装" />
      <Field label="現場住所（任意）" value={siteAddress} onChange={setSiteAddress} />
      <Field label="工期（任意）" value={koki} onChange={setKoki} placeholder="例）9/1〜9/20" />
      <Field label="金額（税抜）" value={amount} onChange={setAmount} type="number" placeholder="0" />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={() => setConfirmOpen(true)} disabled={!ready}>
        この内容で発行する
      </Btn>
      {confirmOpen && (
        <Confirm
          title={`${kindLabel}を発行します`}
          note="送信後は内容を変更できません。取引の記録には残らない、単独の書類です。"
          doc={{
            name: kindLabel,
            rows: [
              ["件名", title],
              ["金額", yen(amountNum)],
              ["消費税", yen(tax)],
              ["合計", yen(amountNum + tax)],
            ],
          }}
          rows={[]}
          okLabel={pending ? "送信中…" : "発行する"}
          onOk={submit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
