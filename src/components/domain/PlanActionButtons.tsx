"use client";

import { useState, useTransition } from "react";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { PlanKey } from "@/domain/plan/Plan";
import { createCheckoutSessionAction, createPortalSessionAction } from "@/app/actions/billing";

export function UpgradeButton({ plan, label }: { plan: Exclude<PlanKey, "free">; label: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError("");
    startTransition(async () => {
      const r = await createCheckoutSessionAction(plan);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = r.value.url;
    });
  };

  return (
    <div>
      <Btn tone="ki" disabled={pending} onClick={run}>
        {pending ? "処理中…" : label}
      </Btn>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error === "ALREADY_SUBSCRIBED" ? "既に有料プランをご利用中です。下の「請求情報を管理する」からプランを変更してください。" : error}
        </p>
      )}
    </div>
  );
}

export function ManageBillingButton() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError("");
    startTransition(async () => {
      const r = await createPortalSessionAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.location.href = r.value.url;
    });
  };

  return (
    <div>
      <Btn tone="sumi" disabled={pending} onClick={run}>
        {pending ? "処理中…" : "請求情報を管理する"}
      </Btn>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
    </div>
  );
}
