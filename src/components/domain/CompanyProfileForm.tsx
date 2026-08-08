"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/styles/tokens";
import { Field } from "@/components/ui/Field";
import { Pills } from "@/components/ui/Pills";
import { Btn } from "@/components/ui/Btn";
import { CompanyEditableProfile } from "@/domain/company/Company";
import { updateCompanyProfileAction } from "@/app/actions/company";

const STANCE_LABEL = { uke: "受注側", moto: "発注側", both: "両方" } as const;
const STANCE_OPTIONS = ["受注側", "発注側", "両方"];
const STANCE_BY_LABEL: Record<string, CompanyEditableProfile["stance"]> = { 受注側: "uke", 発注側: "moto", 両方: "both" };

const toCsv = (list: string[]) => list.join("、");
const fromCsv = (text: string) =>
  text
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);

export function CompanyProfileForm({ profile, canEditApprovalLimit }: { profile: CompanyEditableProfile; canEditApprovalLimit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(profile);
  const [industriesText, setIndustriesText] = useState(toCsv(profile.industries));
  const [serviceAreasText, setServiceAreasText] = useState(toCsv(profile.serviceAreas));
  const [licenseTypesText, setLicenseTypesText] = useState(toCsv(profile.licenseTypes));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof CompanyEditableProfile>(key: K, value: CompanyEditableProfile[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    setError("");
    setNotice("");
    const payload: CompanyEditableProfile = {
      ...form,
      industries: fromCsv(industriesText),
      serviceAreas: fromCsv(serviceAreasText),
      licenseTypes: fromCsv(licenseTypesText),
    };
    startTransition(async () => {
      const r = await updateCompanyProfileAction(payload);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setNotice("保存しました");
      router.refresh();
    });
  };

  return (
    <div>
      <Field label="会社名" value={form.name} onChange={(v) => set("name", v)} />
      <Field label="ふりがな" value={form.kana ?? ""} onChange={(v) => set("kana", v)} />
      <Field label="代表者名" value={form.repName ?? ""} onChange={(v) => set("repName", v)} />
      <Field label="設立" value={form.established ?? ""} onChange={(v) => set("established", v)} placeholder="例）2010年" />

      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          立場
        </span>
        <Pills
          options={STANCE_OPTIONS}
          value={STANCE_LABEL[form.stance]}
          onChange={(label) => set("stance", STANCE_BY_LABEL[label])}
        />
      </div>

      <Field label="郵便番号" value={form.postal ?? ""} onChange={(v) => set("postal", v)} placeholder="123-4567" />
      <Field label="住所" value={form.address ?? ""} onChange={(v) => set("address", v)} placeholder="千葉県〇〇市..." />
      <Field label="電話番号" value={form.tel ?? ""} onChange={(v) => set("tel", v)} />
      <Field label="ホームページ・SNS" value={form.url ?? ""} onChange={(v) => set("url", v)} placeholder="https://..." />
      <Field label="対応職種（読点区切り）" value={industriesText} onChange={setIndustriesText} placeholder="足場、解体" />
      <Field label="対応エリア（読点区切り）" value={serviceAreasText} onChange={setServiceAreasText} placeholder="千葉県、東京都" />
      <Field label="建設業許可番号" value={form.licenseNo ?? ""} onChange={(v) => set("licenseNo", v)} />
      <Field label="許可業種（読点区切り）" value={licenseTypesText} onChange={setLicenseTypesText} placeholder="とび・土工、解体" />
      <Field label="許可の有効期限" type="date" value={form.licenseExpiry ?? ""} onChange={(v) => set("licenseExpiry", v)} />

      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          社会保険等の加入状況
        </span>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["kenpo", "健康保険"],
              ["kounen", "厚生年金"],
              ["koyou", "雇用保険"],
              ["rousaiUwanose", "労災上乗せ保険"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-[13px]" style={{ color: C.sumi }}>
              <input type="checkbox" checked={form.insurance[key]} onChange={(e) => set("insurance", { ...form.insurance, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <Field label="インボイス登録番号" value={form.invoiceNo ?? ""} onChange={(v) => set("invoiceNo", v)} />
      <Field label="CCUS事業者ID" value={form.ccusId ?? ""} onChange={(v) => set("ccusId", v)} />

      {canEditApprovalLimit && (
        <label className="block mb-3">
          <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
            経理が単独で承認できる請求額の上限（円）
          </span>
          <input
            type="number"
            value={form.invoiceApprovalLimit}
            onChange={(e) => set("invoiceApprovalLimit", Number(e.target.value))}
            className="w-full px-3 py-2 text-[15px] outline-none"
            style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
          />
        </label>
      )}

      {error && (
        <p className="text-[12px] mb-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="text-[12px] mb-2" style={{ color: C.midori }}>
          {notice}
        </p>
      )}

      <Btn tone="ki" disabled={pending} onClick={submit}>
        {pending ? "保存中…" : "保存する"}
      </Btn>
    </div>
  );
}
