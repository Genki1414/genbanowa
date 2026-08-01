"use client";

import { useState } from "react";
import { C, MONO } from "@/styles/tokens";
import { Check, FileText } from "lucide-react";
import { Btn } from "./Btn";

type Doc = { name: string; rows: [string, string][] };

/**
 * 送信前の確認モーダル。取引・書類まわりは immutable なので、
 * 送信前にここで必ず内容を見せる。
 */
export function Confirm({
  title,
  note,
  rows,
  okLabel,
  onOk,
  onCancel,
  doc,
  check,
}: {
  title: string;
  note?: string;
  rows: [string, string][];
  okLabel: string;
  onOk: () => void;
  onCancel: () => void;
  doc?: Doc;
  check?: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const ready = !check || agreed;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto"
      style={{ background: "rgba(20,23,28,.55)" }}
    >
      <div className="w-full max-w-md p-3" style={{ background: C.kami, borderTop: `4px solid ${C.ki}` }}>
        <div className="text-[16px] font-extrabold mb-1" style={{ color: C.sumi }}>
          {title}
        </div>
        {note && (
          <p className="text-[12px] mb-3" style={{ color: C.usu }}>
            {note}
          </p>
        )}
        {doc && (
          <div className="p-3 mb-3 rounded-sm" style={{ background: C.kami, border: `2px solid ${C.midori}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={15} style={{ color: C.midori }} />
              <span className="text-[13px] font-extrabold" style={{ color: C.sumi }}>
                {doc.name}
              </span>
            </div>
            {doc.rows.map(([k, v], i) => (
              <div key={i} className="flex gap-2 py-[3px]">
                <span className="text-[12px] w-20 flex-shrink-0" style={{ color: C.usu }}>
                  {k}
                </span>
                <span className="text-[13px] font-bold" style={{ color: C.sumi, fontFamily: MONO }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="p-3 mb-3 rounded-sm" style={{ background: C.yojo }}>
          {rows.map(([k, v], i) => (
            <div key={i} className="flex gap-2 py-[3px]">
              <span className="text-[12px] w-20 flex-shrink-0" style={{ color: C.usu }}>
                {k}
              </span>
              <span className="text-[13px] font-bold" style={{ color: C.sumi, fontFamily: MONO }}>
                {v}
              </span>
            </div>
          ))}
        </div>
        {check && (
          <button
            onClick={() => setAgreed(!agreed)}
            className="flex items-start gap-2 w-full text-left p-3 mb-3 rounded-sm"
            style={{ background: agreed ? C.kami : C.yojo, border: `2px solid ${agreed ? C.midori : C.keisen}` }}
          >
            <span
              className="rounded-sm flex items-center justify-center flex-shrink-0"
              style={{
                width: 20,
                height: 20,
                marginTop: 1,
                background: agreed ? C.midori : C.kami,
                border: `2px solid ${agreed ? C.midori : C.keisen}`,
              }}
            >
              {agreed && <Check size={14} color="#fff" strokeWidth={3} />}
            </span>
            <span className="text-[13px] font-bold" style={{ color: C.sumi }}>
              {check}
            </span>
          </button>
        )}
        <Btn tone="ki" disabled={!ready} onClick={onOk}>
          {okLabel}
        </Btn>
        <button onClick={onCancel} className="w-full py-3 mt-2 text-[14px] font-bold" style={{ color: C.usu }}>
          戻って直す
        </button>
      </div>
    </div>
  );
}
