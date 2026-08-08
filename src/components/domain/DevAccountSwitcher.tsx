"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/styles/tokens";
import { createClient } from "@/lib/supabase/client";
import { listDevAccountsAction, DevAccount } from "@/app/actions/dev";
import { ROLE_LABEL, Role } from "@/domain/auth/Role";

const PASSWORD_STORAGE_KEY = "genbanowa-dev-switch-password";

/**
 * 検証専用：会社をログアウトなしでワンクリック切り替えるための開発ツール。
 * 本番ビルドでは listDevAccountsAction() が常に空配列を返すため、何も表示されない
 * （サーバー側で落ちるので、このコンポーネントの出し分けだけに頼っていない）。
 * scripts/dev-provision-test-logins.mjs で用意した共通パスワードをこのブラウザに1回覚えさせておくと、
 * 以後は会社名を選ぶだけで signOut→signInWithPassword を自動で行う。
 */
export function DevAccountSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<DevAccount[]>([]);
  const [password, setPassword] = useState(() => (typeof window === "undefined" ? "" : (sessionStorage.getItem(PASSWORD_STORAGE_KEY) ?? "")));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listDevAccountsAction().then(setAccounts);
  }, []);

  if (process.env.NODE_ENV === "production") return null;
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-50 text-[11px] font-bold px-2 py-1 rounded-sm"
        style={{ bottom: 62, right: 8, background: C.aka, color: "#fff", opacity: 0.85 }}
      >
        DEV切替
      </button>
    );
  }

  const switchTo = (email: string) => {
    setError("");
    sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(`ログインに失敗しました（${signInError.message}）。共通パスワードが正しいか確認してください。`);
        return;
      }
      setOpen(false);
      router.push("/transactions");
      router.refresh();
    });
  };

  return (
    <div
      className="fixed z-50 p-3 rounded-sm"
      style={{ bottom: 62, right: 8, left: 8, background: "#fff", border: `2px dashed ${C.aka}`, maxWidth: 420, marginLeft: "auto" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-extrabold" style={{ color: C.aka }}>
          検証専用：会社を切り替え
        </span>
        <span className="flex-1" />
        <button onClick={() => setOpen(false)} className="text-[12px] font-bold" style={{ color: C.usu }}>
          閉じる
        </button>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="共通パスワード（scripts/dev-provision-test-logins.mjsで設定したもの）"
        className="w-full px-2 py-1.5 text-[13px] mb-2 outline-none"
        style={{ border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
      />
      {accounts.length === 0 && (
        <p className="text-[12px]" style={{ color: C.usu }}>
          一覧が空です。scripts/dev-provision-test-logins.mjs を実行済みか確認してください。
        </p>
      )}
      <div className="max-h-48 overflow-y-auto">
        {accounts.map((a) => (
          <button
            key={a.email}
            disabled={pending || !password}
            onClick={() => switchTo(a.email)}
            className="w-full text-left px-2 py-1.5 mb-1 text-[13px] font-bold rounded-sm disabled:opacity-40"
            style={{ background: C.yojo, color: C.sumi }}
          >
            {a.companyName}
            <span className="text-[11px] font-normal ml-1" style={{ color: C.usu }}>
              （{ROLE_LABEL[a.role as Role]}・{a.email}）
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="text-[12px] mt-1" style={{ color: C.aka }}>
          {error}
        </p>
      )}
    </div>
  );
}
