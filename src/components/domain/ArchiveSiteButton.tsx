"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Confirm } from "@/components/ui/Confirm";
import { C } from "@/styles/tokens";
import { archiveSiteAction } from "@/app/actions/site";

export function ArchiveSiteButton({ id }: { id: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      const r = await archiveSiteAction(id);
      setConfirmOpen(false);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setConfirmOpen(true)} className="p-2" aria-label="現場を削除">
        <Trash2 size={17} style={{ color: C.aka }} />
      </button>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {confirmOpen && (
        <Confirm
          title="現場を削除します"
          note="撮影済みの写真は消えません。同時に持てる現場数の枠が空きます。"
          rows={[]}
          okLabel={pending ? "送信中…" : "削除する"}
          onOk={run}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
