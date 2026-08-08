import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { Row } from "@/components/ui/Row";
import { Chip } from "@/components/ui/Chip";
import { DecideTrustDocumentForm } from "@/components/domain/DecideTrustDocumentForm";
import { currentActor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTrustDocumentDetail } from "@/lib/supabase/adminRepo";
import { fmt } from "@/domain/shared/date";

const STATUS_LABEL = { pending: "確認待ち", approved: "承認済み", rejected: "却下" } as const;

const INSURANCE_LABEL: Record<string, string> = {
  kenpo: "健康保険",
  kounen: "厚生年金",
  koyou: "雇用保険",
  rousai_uwanose: "労災上乗せ保険",
};

export default async function AdminTrustDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!actor.isStaff) redirect("/transactions");

  const { id } = await params;
  const admin = createAdminClient();
  const doc = await loadTrustDocumentDetail(admin, id);
  if (!doc) notFound();

  const hasEvidence = doc.kind === "kyoka" || doc.kind === "hoken" || !!doc.value;

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader
        title="信用書類の確認"
        right={
          <Link href={`/companies/${doc.companyId}`} className="text-[12px] font-bold underline" style={{ color: C.sumi }}>
            会社ページを見る
          </Link>
        }
      />
      <main className="max-w-md mx-auto p-3">
        <DenpyoCard tone="plain">
          <div className="flex items-center gap-2 mb-2">
            <Chip solid color={doc.status === "approved" ? C.midori : doc.status === "rejected" ? C.aka : C.ki}>
              {STATUS_LABEL[doc.status]}
            </Chip>
            <Chip color={C.usu}>+{doc.points}点</Chip>
          </div>
          <Row label="会社" value={doc.companyName} />
          <Row label="書類" value={doc.label} />
          <Row label="提出日" value={fmt(doc.createdAt)} mono />

          {doc.kind === "kyoka" && doc.values && (
            <>
              <Row label="許可番号" value={String(doc.values.license_no ?? "—")} />
              <Row label="許可業種" value={(doc.values.license_types as string[] | undefined)?.join("、") || "—"} />
              <Row label="有効期限" value={doc.values.license_expiry ? fmt(String(doc.values.license_expiry)) : "—"} mono />
            </>
          )}
          {doc.kind === "hoken" && doc.values && (
            <div className="pt-2 mt-2" style={{ borderTop: `1px dashed ${C.keisen}` }}>
              {Object.entries(INSURANCE_LABEL).map(([key, label]) => (
                <Row key={key} label={label} value={doc.values![key] ? "加入" : "未加入"} />
              ))}
            </div>
          )}
          {doc.kind === "hp" && doc.value && (
            <a href={doc.value} target="_blank" rel="noreferrer" className="block text-[13px] font-bold underline mt-1" style={{ color: C.sumi }}>
              {doc.value}
            </a>
          )}
          {(doc.kind === "invoice" || doc.kind === "ccus") && <Row label="内容" value={doc.value ?? "—"} mono />}
        </DenpyoCard>

        {!hasEvidence && (
          <div className="mt-3 p-2.5 rounded-sm" style={{ background: C.yojo, border: `1px solid ${C.aka}` }}>
            <p className="text-[12px]" style={{ color: C.aka }}>
              {doc.label}はファイル添付が未対応のため、申告内容の記録以外に確認できる情報がありません。
              電話等アプリ外での確認が必要な場合は、確認が取れるまで判断を保留してください。
            </p>
          </div>
        )}

        {doc.approvedLabels.length > 0 && (
          <div className="mt-3">
            <h2 className="text-[12px] font-extrabold mb-1" style={{ color: C.usu }}>
              この会社の承認済み書類
            </h2>
            <div className="flex flex-wrap gap-1">
              {doc.approvedLabels.map((l) => (
                <Chip key={l} color={C.midori}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {doc.status === "pending" ? (
          <div className="mt-4">
            <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
              判断
            </h2>
            <DecideTrustDocumentForm docId={doc.id} />
          </div>
        ) : (
          <p className="text-[12px] mt-3" style={{ color: C.usu }}>
            この書類はすでに{STATUS_LABEL[doc.status]}です。
          </p>
        )}
      </main>
    </div>
  );
}
