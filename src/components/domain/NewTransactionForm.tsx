"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { DateRange } from "@/components/ui/DateRange";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { yen } from "@/domain/shared/money";
import { range } from "@/domain/shared/date";
import { createTransactionAction } from "@/app/actions/transaction";

const KEISHIKI_OPTIONS = ["請負", "人工"] as const;

export function NewTransactionForm({ conversationId, partnerName }: { conversationId: string; partnerName: string }) {
  const [title, setTitle] = useState("");
  const [keishikiLabel, setKeishikiLabel] = useState<(typeof KEISHIKI_OPTIONS)[number]>("請負");
  const [amount, setAmount] = useState("");
  const [tanka, setTanka] = useState("");
  const [kokiA, setKokiA] = useState("");
  const [kokiB, setKokiB] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const keishiki = keishikiLabel === "請負" ? "ukeoi" : "ninku";
  const ready = title && kokiA && kokiB && paymentTerms && (keishiki === "ukeoi" ? amount : tanka);

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await createTransactionAction(conversationId, {
        title,
        closingDay: closingDay || undefined,
        keishiki,
        amount: keishiki === "ukeoi" ? Number(amount) : 0,
        tanka: keishiki === "ninku" ? Number(tanka) : 0,
        kokiFrom: kokiA,
        kokiTo: kokiB,
        siteAddress: siteAddress || undefined,
        paymentTerms,
        note: note || undefined,
      });
      if (!r.ok) {
        setConfirmOpen(false);
        setError(r.error);
        return;
      }
      router.push(`/transactions/${r.value.transactionId}`);
      router.refresh();
    });
  };

  return (
    <div>
      <Field label="工事名" value={title} onChange={setTitle} placeholder="例）五井中央 共同住宅 外部足場" />
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          形態
        </span>
        <Radio options={[...KEISHIKI_OPTIONS]} value={keishikiLabel} onChange={(v) => setKeishikiLabel(v as (typeof KEISHIKI_OPTIONS)[number])} />
      </div>
      {keishiki === "ukeoi" ? (
        <Field label="請負代金（税抜）" value={amount} onChange={setAmount} type="number" placeholder="0" />
      ) : (
        <Field label="人工単価（税抜）" value={tanka} onChange={setTanka} type="number" placeholder="0" hint="1人工あたりの単価" />
      )}
      <DateRange label="工期" a={kokiA} b={kokiB} onA={setKokiA} onB={setKokiB} />
      <Field label="現場住所（任意）" value={siteAddress} onChange={setSiteAddress} />
      <Field label="支払日" value={paymentTerms} onChange={setPaymentTerms} placeholder="例）翌月末" />
      <Field label="締め日（任意）" value={closingDay} onChange={setClosingDay} placeholder="例）末日" />
      <Field label="特記事項（任意）" value={note} onChange={setNote} />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={() => setConfirmOpen(true)} disabled={!ready}>
        この内容で注文書を送る
      </Btn>
      {confirmOpen && (
        <Confirm
          title="取引を依頼します"
          note="送信後は内容を変更できません。訂正は差し戻しか、新しい注文書の発行になります。"
          doc={{
            name: `注文書（${keishikiLabel}）`,
            rows: [
              ["相手", partnerName],
              ["工事名", title],
              [keishiki === "ukeoi" ? "金額" : "人工単価", keishiki === "ukeoi" ? yen(Number(amount)) : `${yen(Number(tanka))}／人工`],
              ["工期", range(kokiA, kokiB)],
              ["支払日", paymentTerms],
            ],
          }}
          rows={[]}
          okLabel={pending ? "送信中…" : "送信する"}
          onOk={submit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
