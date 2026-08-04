"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { DateRange } from "@/components/ui/DateRange";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { postAvailabilityAction } from "@/app/actions/job";

const KIND_OPTIONS = ["人工の空き", "工事枠の空き"] as const;

export function PostAvailabilityForm() {
  const [kindLabel, setKindLabel] = useState<(typeof KIND_OPTIONS)[number]>("人工の空き");
  const [industry, setIndustry] = useState("");
  const [area, setArea] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [tanka, setTanka] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const kind = kindLabel === "人工の空き" ? "ninku" : "waku";
  const ready = industry && area && fromDate && toDate;

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await postAvailabilityAction({
        kind,
        industry,
        area,
        fromDate,
        toDate,
        headcount: Number(headcount) || undefined,
        tanka: Number(tanka) || undefined,
        note: note || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/availabilities");
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          種類
        </span>
        <Radio options={[...KIND_OPTIONS]} value={kindLabel} onChange={(v) => setKindLabel(v as (typeof KIND_OPTIONS)[number])} />
      </div>
      <Field label="業種" value={industry} onChange={setIndustry} placeholder="例）足場" />
      <Field label="エリア" value={area} onChange={setArea} placeholder="例）千葉県" />
      <DateRange label="空き期間" a={fromDate} b={toDate} onA={setFromDate} onB={setToDate} />
      <Field label="対応可能人数（任意）" value={headcount} onChange={setHeadcount} type="number" />
      <Field label="単価（税抜・任意）" value={tanka} onChange={setTanka} type="number" placeholder="応相談なら空欄" />
      <Field label="備考（任意）" value={note} onChange={setNote} />
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
