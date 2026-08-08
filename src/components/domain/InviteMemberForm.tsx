"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Radio } from "@/components/ui/Radio";
import { Btn } from "@/components/ui/Btn";
import { C } from "@/styles/tokens";
import { Role, ROLE_LABEL, BASIC_INVITE_ROLES, ADVANCED_INVITE_ROLES } from "@/domain/auth/Role";
import { inviteMemberAction } from "@/app/actions/members";

/**
 * ロールは5種のまま。ただし一人親方〜数人規模がまず迷わないよう、
 * 既定では経理・事務／現場担当だけを見せる。admin・viewer は「詳細設定」の奥に置く
 * （段階開放と同じ思想。08_リファクタ分割設計.md、依頼者からのフィードバック）。
 */
export function InviteMemberForm() {
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const roles = showAdvanced ? [...BASIC_INVITE_ROLES, ...ADVANCED_INVITE_ROLES] : BASIC_INVITE_ROLES;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleLabel, setRoleLabel] = useState(ROLE_LABEL[BASIC_INVITE_ROLES[0]]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const role = (Object.keys(ROLE_LABEL) as Role[]).find((r) => ROLE_LABEL[r] === roleLabel && roles.includes(r));

  const submit = () => {
    setError("");
    if (!role) {
      setError("ロールを選んでください");
      return;
    }
    startTransition(async () => {
      const r = await inviteMemberAction(email, name, role);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDone(true);
      setEmail("");
      setName("");
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 text-[14px] font-extrabold rounded-sm"
        style={{ background: C.kami, border: `1px dashed ${C.usu}`, color: C.sumi }}
      >
        ＋ メンバーを招待する
      </button>
    );
  }

  return (
    <div>
      <Field label="氏名" value={name} onChange={setName} placeholder="例）鈴木 花子" />
      <Field label="メールアドレス" value={email} onChange={setEmail} type="email" />
      <div className="mb-2">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          ロール
        </span>
        <Radio options={roles.map((r) => ROLE_LABEL[r])} value={roleLabel} onChange={setRoleLabel} />
      </div>
      {!showAdvanced && (
        <button
          onClick={() => setShowAdvanced(true)}
          className="text-[12px] font-bold underline mb-3"
          style={{ color: C.usu }}
        >
          管理者・閲覧のみを選ぶ（10人規模以上向け）
        </button>
      )}
      {error && (
        <p className="text-[12px] mb-3" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {done && (
        <p className="text-[12px] mb-3" style={{ color: C.midori }}>
          招待メールを送りました。
        </p>
      )}
      <Btn tone="ki" onClick={submit} disabled={pending || !email || !name}>
        {pending ? "送信中…" : "招待する"}
      </Btn>
      <button onClick={() => setOpen(false)} className="text-[11px] mt-2 underline" style={{ color: C.usu }}>
        やめる
      </button>
    </div>
  );
}
