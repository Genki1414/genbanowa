"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { C } from "@/styles/tokens";
import { assignFieldUserAction, unassignFieldUserAction } from "@/app/actions/assignments";

interface FieldUser {
  id: string;
  name: string;
}

/**
 * 現場担当（field ロール）の割り当て。担当のユーザーだけがこの取引を見られるようになる。
 * 割り当てられていない field ユーザーには「担当の現場がありません」と表示される
 * （04_権限ロール設計.md 3章）。
 */
export function AssignmentManager({
  txId,
  fieldUsers,
  assignedUserIds,
}: {
  txId: string;
  fieldUsers: FieldUser[];
  assignedUserIds: string[];
}) {
  const [assigned, setAssigned] = useState(new Set(assignedUserIds));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  if (fieldUsers.length === 0) {
    return (
      <p className="text-[12px]" style={{ color: C.usu }}>
        現場担当のメンバーがいません。メンバーページから招待できます。
      </p>
    );
  }

  const toggle = (userId: string) => {
    const wasAssigned = assigned.has(userId);
    setPendingId(userId);
    setError("");
    startTransition(async () => {
      const r = wasAssigned ? await unassignFieldUserAction(txId, userId) : await assignFieldUserAction(txId, userId);
      setPendingId(null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAssigned((prev) => {
        const next = new Set(prev);
        if (wasAssigned) next.delete(userId);
        else next.add(userId);
        return next;
      });
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {fieldUsers.map((u) => {
          const isAssigned = assigned.has(u.id);
          return (
            <button key={u.id} onClick={() => toggle(u.id)} disabled={pendingId === u.id}>
              <Chip color={isAssigned ? C.midori : C.usu} solid={isAssigned}>
                {u.name}
                {isAssigned ? "（担当）" : ""}
              </Chip>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
    </div>
  );
}
