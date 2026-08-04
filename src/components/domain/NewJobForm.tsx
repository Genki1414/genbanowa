"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { DateRange } from "@/components/ui/DateRange";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { postJobAction } from "@/app/actions/job";

const KEISHIKI_OPTIONS = ["請負", "応援（常用）"] as const;

export function NewJobForm() {
  const [name, setName] = useState("");
  const [keishikiLabel, setKeishikiLabel] = useState<(typeof KEISHIKI_OPTIONS)[number]>("請負");
  const [industry, setIndustry] = useState("");
  const [area, setArea] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [kokiA, setKokiA] = useState("");
  const [kokiB, setKokiB] = useState("");
  const [boshuA, setBoshuA] = useState("");
  const [boshuB, setBoshuB] = useState("");
  const [price, setPrice] = useState("");
  const [tanka, setTanka] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const keishiki = keishikiLabel === "請負" ? "ukeoi" : "ouen";
  const ready = name && industry && area;

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await postJobAction({
        name,
        keishiki,
        industry,
        area,
        siteAddress: siteAddress || undefined,
        kokiFrom: kokiA || undefined,
        kokiTo: kokiB || undefined,
        boshuFrom: boshuA || undefined,
        boshuTo: boshuB || undefined,
        price: keishiki === "ukeoi" ? Number(price) || undefined : undefined,
        tanka: keishiki === "ouen" ? Number(tanka) || undefined : undefined,
        headcount: Number(headcount) || undefined,
        paymentTerms: paymentTerms || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/jobs");
      router.refresh();
    });
  };

  return (
    <div>
      <Field label="案件名" value={name} onChange={setName} placeholder="例）五井中央 共同住宅 外部足場" />
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          形態
        </span>
        <Radio options={[...KEISHIKI_OPTIONS]} value={keishikiLabel} onChange={(v) => setKeishikiLabel(v as (typeof KEISHIKI_OPTIONS)[number])} />
      </div>
      <Field label="業種" value={industry} onChange={setIndustry} placeholder="例）足場" />
      <Field label="エリア" value={area} onChange={setArea} placeholder="例）千葉県" />
      <Field label="現場住所（任意）" value={siteAddress} onChange={setSiteAddress} />
      <DateRange label="工期（任意）" a={kokiA} b={kokiB} onA={setKokiA} onB={setKokiB} />
      <DateRange label="募集期間（任意）" a={boshuA} b={boshuB} onA={setBoshuA} onB={setBoshuB} />
      {keishiki === "ukeoi" ? (
        <Field label="金額（税抜・任意）" value={price} onChange={setPrice} type="number" placeholder="応相談なら空欄" />
      ) : (
        <Field label="人工単価（税抜・任意）" value={tanka} onChange={setTanka} type="number" placeholder="0" />
      )}
      <Field label="必要人数（任意）" value={headcount} onChange={setHeadcount} type="number" />
      <Field label="支払条件（任意）" value={paymentTerms} onChange={setPaymentTerms} placeholder="例）翌月末払い" />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={submit} disabled={pending || !ready}>
        {pending ? "投稿中…" : "この内容で投稿する"}
      </Btn>
    </div>
  );
}
