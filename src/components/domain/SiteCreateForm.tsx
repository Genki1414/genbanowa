"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, HardHat } from "lucide-react";
import { C } from "@/styles/tokens";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { SiteCandidate } from "@/lib/supabase/siteRepo";
import { createSiteAction } from "@/app/actions/site";

export function SiteCreateForm({ candidates }: { candidates: SiteCandidate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [transactionId, setTransactionId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const pick = (c: SiteCandidate) => {
    setTransactionId(c.transactionId);
    setName(c.title);
    setAddress(c.siteAddress ?? "");
  };

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await createSiteAction({ name, address: address || undefined, transactionId });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/sites/${r.value.id}`);
    });
  };

  return (
    <div>
      {candidates.length > 0 && (
        <div className="mb-4">
          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
            受注中の現場から選ぶ
          </span>
          {candidates.map((c) => {
            const selected = transactionId === c.transactionId;
            return (
              <button
                key={c.transactionId}
                onClick={() => pick(c)}
                className="w-full text-left p-2.5 mb-2 rounded-sm"
                style={{ background: selected ? C.ki : C.kami, border: `1px solid ${selected ? C.ki : C.keisen}` }}
              >
                <div className="flex items-center gap-2">
                  <HardHat size={17} style={{ color: C.sumi, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-extrabold truncate" style={{ color: C.sumi }}>
                      {c.title}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: C.usu }}>
                      {c.partnerCompanyName}
                    </div>
                  </div>
                  {selected && <Check size={17} style={{ color: C.sumi }} />}
                </div>
              </button>
            );
          })}
          <div className="text-[11px] mt-2 mb-1" style={{ color: C.usu }}>
            受注していない現場は、下に直接入力してください。
          </div>
        </div>
      )}

      <Field label="現場名（黒板の工事名になります）" value={name} onChange={setName} placeholder="五井中央 共同住宅" />
      <Field label="住所" value={address} onChange={setAddress} placeholder="市原市五井中央西2-1-8" />

      {error && (
        <p className="text-[12px] mb-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}

      <Btn tone="ki" disabled={!name.trim() || pending} onClick={submit}>
        この現場をつくる
      </Btn>
    </div>
  );
}
