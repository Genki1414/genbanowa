import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { Header } from "@/components/ui/Header";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Chip } from "@/components/ui/Chip";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadConversationList } from "@/lib/supabase/conversationRepo";
import { fmt } from "@/domain/shared/date";

export default async function MessagesPage() {
  const actor = await currentActor();
  if (!actor) redirect("/login");

  const supabase = await createClient();
  const list = await loadConversationList(supabase, actor.companyId);

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <Header
        title="メッセージ"
        right={
          <Link href="/messages/new" className="text-[13px] font-bold px-2 py-1" style={{ color: C.ki }}>
            + 新規
          </Link>
        }
      />
      <main className="max-w-md mx-auto p-3">
        {list.length === 0 && (
          <p className="text-[12px]" style={{ color: C.usu }}>
            まだやり取りがありません。「+ 新規」から会社にメッセージを送れます。
          </p>
        )}
        {list.map((c) => (
          <Link key={c.id} href={`/messages/${c.id}`}>
            <DenpyoCard tone="plain">
              <div className="flex items-center gap-2 mb-1">
                <Chip color={c.kind === "job" ? C.sumi : C.usu}>{c.kind === "job" ? "案件のやり取り" : "直接のやり取り"}</Chip>
                <span className="flex-1" />
                {c.unread > 0 && (
                  <span
                    className="text-[11px] px-1.5 py-[1px] rounded-full flex-shrink-0"
                    style={{ background: C.aka, color: "#fff" }}
                  >
                    {c.unread}
                  </span>
                )}
                <span className="text-[11px] flex-shrink-0" style={{ color: C.usu }}>
                  {fmt(c.lastAt)}
                </span>
              </div>
              <div className="text-[13px] font-extrabold mb-1" style={{ color: C.sumi }}>
                {c.partnerCompanyName}
              </div>
              <div className="text-[12px] truncate" style={{ color: C.usu }}>
                {c.lastMessagePreview || "（メッセージなし）"}
              </div>
            </DenpyoCard>
          </Link>
        ))}
      </main>
    </div>
  );
}
