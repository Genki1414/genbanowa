"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { openScoutAction } from "@/app/actions/scout";

export function OpenScoutButton({ scoutId }: { scoutId: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const open = () => {
    setError("");
    startTransition(async () => {
      const r = await openScoutAction(scoutId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <Btn tone="ki" onClick={open} disabled={pending}>
        {pending ? "開封中…" : "開封してメッセージを見る"}
      </Btn>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
    </div>
  );
}
