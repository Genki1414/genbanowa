"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { C } from "@/styles/tokens";
import { searchCompaniesAction, startConversationAction } from "@/app/actions/conversation";

export function StartConversationForm({ preselected }: { preselected?: { id: string; name: string } }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(preselected ?? null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
      const r = await startConversationAction(selected.id, message);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/messages/${r.value.conversationId}`);
      router.refresh();
    });
  };

  if (selected) {
    return (
      <div>
        <DenpyoCard tone="plain">
          <div className="text-[11px] mb-1" style={{ color: C.usu }}>
            相手
          </div>
          <div className="text-[14px] font-extrabold" style={{ color: C.sumi }}>
            {selected.name}
          </div>
        </DenpyoCard>
        <button
          onClick={() => setSelected(null)}
          className="block mb-3 text-[12px] font-bold underline"
          style={{ color: C.usu }}
        >
          相手を選び直す
        </button>
        <Field label="最初のメッセージ" value={message} onChange={setMessage} placeholder="例）現在の空き状況を教えてください" />
        {error && (
          <p className="text-[12px] mb-3" style={{ color: C.aka }}>
            {error}
          </p>
        )}
        <Btn tone="ki" onClick={submit} disabled={pending || !message.trim()}>
          {pending ? "送信中…" : "メッセージを送る"}
        </Btn>
      </div>
    );
  }

  return (
    <div>
      <Field label="会社名で検索" value={query} onChange={setQuery} placeholder="例）高橋工業" />
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
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="block w-full text-left mb-2"
            >
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
