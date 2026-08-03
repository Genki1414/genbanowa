"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Briefcase, Send } from "lucide-react";
import { C } from "@/styles/tokens";
import { sendMessageAction, markReadAction } from "@/app/actions/conversation";

interface ThreadMessage {
  id: string;
  body?: string;
  createdAt: string;
  mine: boolean;
}

export function MessageThread({
  conversationId,
  messages,
  canSend,
  canRequestTransaction,
  hasUnread,
}: {
  conversationId: string;
  messages: ThreadMessage[];
  canSend: boolean;
  canRequestTransaction: boolean;
  hasUnread: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (hasUnread) {
      markReadAction(conversationId);
    }
  }, [conversationId, hasUnread]);

  const send = () => {
    if (!draft.trim()) return;
    setError("");
    startTransition(async () => {
      const r = await sendMessageAction(conversationId, draft);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDraft("");
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex-1 p-3 pb-32 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-[13px] py-10 text-center" style={{ color: C.usu }}>
            まだやり取りはありません。
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex mb-2 ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[80%]">
              <div
                className="px-3 py-2 text-[14px] rounded-sm whitespace-pre-wrap break-words"
                style={{
                  background: m.mine ? C.ki : C.kami,
                  border: `1px solid ${m.mine ? C.ki : C.keisen}`,
                  color: C.sumi,
                }}
              >
                {m.body}
              </div>
              <div className="flex mt-1" style={{ justifyContent: m.mine ? "flex-end" : "flex-start" }}>
                <span className="text-[10px]" style={{ color: C.usu }}>
                  {new Date(m.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {canSend && (
        <div className="fixed bottom-0 left-1/2 w-full max-w-md z-40" style={{ transform: "translateX(-50%)", background: C.kami, borderTop: `1px solid ${C.keisen}` }}>
          {attachOpen && canRequestTransaction && (
            <div className="p-2" style={{ borderBottom: `1px solid ${C.keisen}` }}>
              <Link
                href={`/messages/${conversationId}/request-transaction`}
                className="w-full py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5"
                style={{ background: C.ki, color: C.sumi }}
              >
                <Briefcase size={15} />
                この会社に取引を依頼する
              </Link>
            </div>
          )}
          {error && (
            <p className="text-[12px] px-3 pt-2" style={{ color: C.aka }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 p-2">
            {canRequestTransaction && (
              <button
                onClick={() => setAttachOpen(!attachOpen)}
                className="px-3 rounded-sm"
                style={{ background: attachOpen ? C.ki : C.yojo }}
                aria-label="メニュー"
              >
                <Plus size={19} style={{ color: C.sumi, transform: attachOpen ? "rotate(45deg)" : "none" }} />
              </button>
            )}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="メッセージを書く"
              className="flex-1 px-3 py-2 text-[15px] outline-none"
              style={{ border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
            />
            <button onClick={send} disabled={pending || !draft.trim()} className="px-4 rounded-sm disabled:opacity-40" style={{ background: C.sumi }} aria-label="送信">
              <Send size={17} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
