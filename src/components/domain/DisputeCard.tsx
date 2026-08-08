"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/styles/tokens";
import { Chip } from "@/components/ui/Chip";
import { Btn } from "@/components/ui/Btn";
import { Field } from "@/components/ui/Field";
import { Confirm } from "@/components/ui/Confirm";
import { DisputeStatus, DisputeLog } from "@/domain/transaction/Dispute";
import { fmt } from "@/domain/shared/date";
import {
  requestConfirmationAction,
  respondDisputeAction,
  acceptProposedDateAction,
  escalateDisputeAction,
} from "@/app/actions/dispute";

const STATUS_LABEL: Record<DisputeStatus, string> = {
  overdue: "期日超過",
  confirming: "入金確認を依頼中",
  date_proposed: "支払予定日の申告あり",
  objected: "異議あり",
  under_review: "運営が事実確認中",
  resolved: "解決（記録なし）",
  recorded: "遅延として記録",
};

const STATUS_COLOR: Record<DisputeStatus, string> = {
  overdue: C.aka,
  confirming: C.ki,
  date_proposed: C.ki,
  objected: C.aka,
  under_review: C.usu,
  resolved: C.midori,
  recorded: C.aka,
};

const ACTOR_LABEL = { uke: "受注者", moto: "発注者", admin: "運営", system: "system" } as const;

interface DisputeInfo {
  id: string;
  status: DisputeStatus;
  proposedDate?: string;
  objection?: string;
  decisionNote?: string;
}

export function DisputeCard({
  txId,
  invoiceId,
  dispute,
  logs,
  side,
  canRequest,
  canRequestNow,
  canObject,
}: {
  txId: string;
  invoiceId: string;
  dispute: DisputeInfo | null;
  logs: DisputeLog[];
  side: "moto" | "uke";
  /** dispute.request 権限（担当ロールか）。既存disputeへの承諾・運営依頼ボタンの表示に使う。 */
  canRequest: boolean;
  /** 今この請求書に対して新規に確認依頼を出せるか（権限に加えて期日超過・状態も満たすか）。 */
  canRequestNow: boolean;
  canObject: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [respondMode, setRespondMode] = useState<"date" | "objection" | null>(null);
  const [proposedDate, setProposedDate] = useState("");
  const [objection, setObjection] = useState("");
  const [escalateConfirm, setEscalateConfirm] = useState(false);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError("");
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        setError(r.error ?? "エラーが発生しました");
        return;
      }
      setRespondMode(null);
      setEscalateConfirm(false);
      router.refresh();
    });
  };

  if (!dispute) {
    if (!(side === "uke" && canRequestNow)) return null;
    return (
      <div className="mb-3 -mt-2">
        <Btn tone="aka" disabled={pending} onClick={() => run(() => requestConfirmationAction(txId, invoiceId))}>
          入金の確認を依頼する
        </Btn>
        {error && (
          <p className="text-[12px] mt-1" style={{ color: C.aka }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 mb-3 -mt-2 rounded-sm" style={{ background: C.kami, border: `1px solid ${C.keisen}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Chip solid color={STATUS_COLOR[dispute.status]}>
          {STATUS_LABEL[dispute.status]}
        </Chip>
      </div>

      {logs.length > 0 && (
        <div className="mb-2">
          {logs.map((l) => (
            <div key={l.id} className="text-[12px] mb-1" style={{ color: C.usu }}>
              <span className="font-bold" style={{ color: C.sumi }}>
                {ACTOR_LABEL[l.actor]}
              </span>
              ：{l.text}
            </div>
          ))}
        </div>
      )}

      {dispute.status === "recorded" && dispute.decisionNote && (
        <p className="text-[12px]" style={{ color: C.usu }}>
          運営コメント：{dispute.decisionNote}
        </p>
      )}
      {dispute.status === "resolved" && dispute.decisionNote && (
        <p className="text-[12px]" style={{ color: C.usu }}>
          運営コメント：{dispute.decisionNote}
        </p>
      )}

      {dispute.status === "confirming" && side === "moto" && canObject && (
        <div>
          {respondMode === null && (
            <div className="flex flex-wrap gap-2">
              <Btn tone="midori" onClick={() => run(() => respondDisputeAction(txId, dispute.id, "paid", {}))}>
                支払済みです
              </Btn>
              <Btn tone="ki" onClick={() => setRespondMode("date")}>
                支払予定日を申告する
              </Btn>
              <Btn tone="aka" onClick={() => setRespondMode("objection")}>
                異議がある
              </Btn>
            </div>
          )}
          {respondMode === "date" && (
            <div className="mt-2">
              <label className="block mb-3">
                <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
                  支払予定日
                </span>
                <input
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full px-3 py-2 text-[15px] outline-none"
                  style={{ background: "#fff", border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
                />
              </label>
              <div className="flex gap-2">
                <Btn
                  tone="ki"
                  disabled={!proposedDate}
                  onClick={() => run(() => respondDisputeAction(txId, dispute.id, "date", { proposedDate }))}
                >
                  この内容で申告する
                </Btn>
                <button className="text-[12px] font-bold px-2" style={{ color: C.usu }} onClick={() => setRespondMode(null)}>
                  戻る
                </button>
              </div>
            </div>
          )}
          {respondMode === "objection" && (
            <div className="mt-2">
              <Field label="異議の内容" value={objection} onChange={setObjection} placeholder="例）出来高が違うため精算を保留しています" />
              <div className="flex gap-2">
                <Btn
                  tone="aka"
                  disabled={!objection.trim()}
                  onClick={() => run(() => respondDisputeAction(txId, dispute.id, "objection", { objection }))}
                >
                  この内容で異議を出す
                </Btn>
                <button className="text-[12px] font-bold px-2" style={{ color: C.usu }} onClick={() => setRespondMode(null)}>
                  戻る
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {dispute.status === "confirming" && side === "uke" && canRequest && (
        <Btn tone="aka" onClick={() => setEscalateConfirm(true)}>
          運営に判断を依頼する
        </Btn>
      )}

      {dispute.status === "date_proposed" && side === "uke" && canRequest && (
        <div>
          <p className="text-[13px] font-bold mb-2" style={{ color: C.sumi }}>
            申告された支払予定日：{fmt(dispute.proposedDate)}
          </p>
          <div className="flex gap-2">
            <Btn tone="midori" onClick={() => run(() => acceptProposedDateAction(txId, dispute.id))}>
              承諾する
            </Btn>
            <Btn tone="aka" onClick={() => setEscalateConfirm(true)}>
              承諾しない（運営に依頼）
            </Btn>
          </div>
        </div>
      )}

      {dispute.status === "objected" && side === "uke" && canRequest && (
        <div>
          {dispute.objection && (
            <p className="text-[13px] mb-2" style={{ color: C.sumi }}>
              異議の内容：{dispute.objection}
            </p>
          )}
          <Btn tone="aka" onClick={() => setEscalateConfirm(true)}>
            運営に判断を依頼する
          </Btn>
        </div>
      )}

      {error && (
        <p className="text-[12px] mt-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}

      {escalateConfirm && (
        <Confirm
          title="運営に事実確認を依頼します"
          note="注文書・請求書・日報・やり取りの記録をもとに運営が確認します。結論が出るまで信用情報には反映されません。"
          rows={[]}
          okLabel={pending ? "送信中…" : "依頼する"}
          onOk={() => run(() => escalateDisputeAction(txId, dispute.id))}
          onCancel={() => setEscalateConfirm(false)}
        />
      )}
    </div>
  );
}
