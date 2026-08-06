"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { C } from "@/styles/tokens";
import { signOutAction } from "@/app/actions/auth";
import { ROLE_LABEL, Role } from "@/domain/auth/Role";

/** 今どのアカウントでログイン中かを常に見えるようにする（検証・切り替え作業でのログイン先取り違え防止）。 */
export function UserMenu({ name, role, isStaff }: { name: string; role: Role; isStaff?: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const logout = () => {
    startTransition(async () => {
      await signOutAction();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] truncate max-w-[110px]" style={{ color: "#fff" }}>
        {name}（{ROLE_LABEL[role]}）
      </span>
      {isStaff && (
        <Link href="/admin/disputes" className="text-[11px] font-bold px-2 py-1 rounded-sm flex-shrink-0" style={{ background: C.ki, color: C.sumi }}>
          運営
        </Link>
      )}
      <button
        onClick={logout}
        disabled={pending}
        className="text-[11px] font-bold px-2 py-1 rounded-sm flex-shrink-0"
        style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}
      >
        {pending ? "…" : "ログアウト"}
      </button>
    </div>
  );
}
