"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { C } from "@/styles/tokens";
import { searchCompaniesAction } from "@/app/actions/conversation";
import { sendScoutAction } from "@/app/actions/scout";

const KIND_OPTIONS = ["スカウト", "見積依頼"] as const;

export function SendScoutForm({ jobId, jobName }: { jobId?: string; jobName?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [kindLabel, setKindLabel] = useState<(typeof KIND_OPTIONS)[number]>("スカウト");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const kind = kindLabel === "スカウト" ? "scout" : "quote_request";

  const search = () => {
    setError("");
    startTransition(async () => {
      const r = await searchCompaniesAction(query);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResults(r.value);
    });
  };

  const submit = () => {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      const r = await sendScoutAction({ toCompanyId: selected.id, kind, message, jobId });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/scouts/sent");
      router.refresh();
    });
  };

  if (selected) {
    return (
      <div>
        {jobName && (
          <div className="mb-3">
            <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
              この案件で声を掛けます
            </span>
            <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
              {jobName}
            </span>
          </div>
        )}
        <DenpyoCard tone="plain">
          <div className="text-[11px] mb-1" style={{ color: C.usu }}>
            相手
          </div>
          <div className="text-[14px] font-extrabold" style={{ color: C.sumi }}>
            {selected.name}
          </div>
        </DenpyoCard>
        <button onClick={() => setSelected(null)} className="block mb-3 text-[12px] font-bold underline" style={{ color: C.usu }}>
          相手を選び直す
        </button>
        <div className="mb-3">
          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
            種類
          </span>
          <Radio options={[...KIND_OPTIONS]} value={kindLabel} onChange={(v) => setKindLabel(v as (typeof KIND_OPTIONS)[number])} />
        </div>
        <Field label="メッセージ" value={message} onChange={setMessage} placeholder="例）対応エリアと工種が合っていたので声を掛けました" />
        {error && (
          <p className="text-[12px] mb-3" style={{ color: C.aka }}>
            {error}
          </p>
        )}
        <Btn tone="ki" onClick={submit} disabled={pending || !message.trim()}>
          {pending ? "送信中…" : "送る"}
        </Btn>
      </div>
    );
  }

  return (
    <div>
      <Field label="会社名で検索" value={query} onChange={setQuery} placeholder="例）彩北総業" />
      <Btn onClick={search} disabled={pending || !query.trim()}>
        {pending ? "検索中…" : "検索する"}
      </Btn>
      {error && (
        <p className="text-[12px] mt-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {results !== null && (
        <div className="mt-3">
          {results.length === 0 && (
            <p className="text-[12px]" style={{ color: C.usu }}>
              見つかりませんでした。
            </p>
          )}
          {results.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="block w-full text-left mb-2">
              <DenpyoCard tone="plain">
                <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
                  {c.name}
                </span>
              </DenpyoCard>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
