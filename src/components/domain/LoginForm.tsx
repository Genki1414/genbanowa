"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Btn } from "@/components/ui/Btn";
import { signInAction } from "@/app/actions/auth";
import { C } from "@/styles/tokens";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError("");
    startTransition(async () => {
      const r = await signInAction(email, password);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div>
      <Field label="メールアドレス" value={email} onChange={setEmail} type="email" />
      <Field label="パスワード" value={password} onChange={setPassword} type="password" />
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      <Btn tone="ki" onClick={submit} disabled={pending || !email || !password}>
        {pending ? "ログイン中…" : "ログイン"}
      </Btn>
    </div>
  );
}
