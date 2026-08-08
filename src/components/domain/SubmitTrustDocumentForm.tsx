"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { submitTrustDocumentAction } from "@/app/actions/company";
import { TrustDocKind } from "@/lib/supabase/database.types";

const NEEDS_VALUE: TrustDocKind[] = ["invoice", "ccus", "hp"];

const fromCsv = (text: string) =>
  text
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);

export function SubmitTrustDocumentForm({ kind, label, rejectNote }: { kind: TrustDocKind; label: string; rejectNote?: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseTypesText, setLicenseTypesText] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [insurance, setInsurance] = useState({ kenpo: false, kounen: false, koyou: false, rousai_uwanose: false });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const needsValue = NEEDS_VALUE.includes(kind);
  const isKyoka = kind === "kyoka";
  const isHoken = kind === "hoken";

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = isKyoka
        ? await submitTrustDocumentAction(kind, undefined, {
            license_no: licenseNo,
            license_types: fromCsv(licenseTypesText),
            license_expiry: licenseExpiry || undefined,
          })
        : isHoken
          ? await submitTrustDocumentAction(kind, undefined, insurance)
          : await submitTrustDocumentAction(kind, value || undefined);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="w-full">
        {rejectNote && (
          <p className="text-[11px] mb-1" style={{ color: C.aka }}>
            却下：{rejectNote}
          </p>
        )}
        <button onClick={() => setOpen(true)} className="text-[11px] font-bold underline flex-shrink-0" style={{ color: C.sumi }}>
          {rejectNote ? "再提出する" : "提出する"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mt-2">
      {isKyoka && (
        <>
          <Field label="建設業許可番号" value={licenseNo} onChange={setLicenseNo} placeholder="東京都知事 般-5 第03310号" />
          <Field label="許可業種（読点区切り）" value={licenseTypesText} onChange={setLicenseTypesText} placeholder="とび・土工、解体" />
          <Field label="許可の有効期限" type="date" value={licenseExpiry} onChange={setLicenseExpiry} />
        </>
      )}
      {isHoken && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["kenpo", "健康保険"],
                ["kounen", "厚生年金"],
                ["koyou", "雇用保険"],
                ["rousai_uwanose", "労災上乗せ保険"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5 text-[13px]" style={{ color: C.sumi }}>
                <input type="checkbox" checked={insurance[k]} onChange={(e) => setInsurance((s) => ({ ...s, [k]: e.target.checked }))} />
                {l}
              </label>
            ))}
          </div>
        </div>
      )}
      {needsValue && (
        <Field
          label={label}
          value={value}
          onChange={setValue}
          placeholder={kind === "invoice" ? "T1234567890123" : kind === "ccus" ? "事業者ID" : "https://"}
        />
      )}
      {!needsValue && !isKyoka && !isHoken && (
        <p className="text-[11px] mb-2" style={{ color: C.usu }}>
          ファイルの添付は今後対応予定です。ひとまず提出申請だけ記録します（運営の確認をもって承認されます）。
        </p>
      )}
      {(isKyoka || isHoken) && (
        <p className="text-[11px] mb-2" style={{ color: C.usu }}>
          ファイルの添付は今後対応予定です。運営が内容を確認のうえ承認します。
        </p>
      )}
      {error && (
        <p className="text-[12px] mb-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Btn tone="ki" onClick={submit} disabled={pending || (needsValue && !value) || (isKyoka && !licenseNo)}>
          {pending ? "送信中…" : "提出する"}
        </Btn>
      </div>
      <button onClick={() => setOpen(false)} className="text-[11px] mt-1 underline" style={{ color: C.usu }}>
        やめる
      </button>
    </div>
  );
}
