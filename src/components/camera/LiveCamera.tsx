"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { C } from "@/styles/tokens";
import { burnBoard, burnFile, canvasToBlob, BoardData } from "./blackboard";
import { BoardOverlay } from "./BoardOverlay";

export function LiveCamera({ b, onCapture, onClose }: { b: BoardData; onCapture: (blob: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    const md = navigator.mediaDevices;
    const request = md?.getUserMedia
      ? md.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      : Promise.reject(new Error("getUserMedia unsupported"));
    request
      .then((s) => {
        if (dead) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play?.();
        }
      })
      .catch(() => setErr("この画面ではカメラを直接開けません。"));
    return () => {
      dead = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    burnBoard(ctx, canvas.width, canvas.height, b);
    onCapture(await canvasToBlob(canvas));
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    onCapture(await burnFile(file, b));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
      <div className="flex items-center justify-between px-3 h-14">
        <button onClick={onClose} className="p-1" aria-label="閉じる">
          <X size={24} color="#fff" />
        </button>
        <span className="text-[13px] font-bold" style={{ color: C.ki }}>
          {b.koushu}／{b.koutei}
        </span>
        <span style={{ width: 26 }} />
      </div>

      {err ? (
        <div className="flex-1 flex flex-col justify-center px-6">
          <p className="text-[14px] mb-1" style={{ color: "#fff" }}>
            {err}
          </p>
          <p className="text-[12px] mb-5" style={{ color: "rgba(255,255,255,.6)" }}>
            プレビュー枠の制限です。端末のカメラを開けば同じように黒板が入ります。
          </p>
          <label
            className="w-full py-3 rounded-sm text-[15px] font-extrabold text-center cursor-pointer block"
            style={{ background: C.ki, color: C.sumi }}
          >
            端末のカメラで撮る
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
          <label
            className="w-full mt-2 py-3 rounded-sm text-[15px] font-extrabold text-center cursor-pointer block"
            style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}
          >
            保存済みの写真を選ぶ
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
        </div>
      ) : (
        <>
          <div className="flex-1 relative flex items-center justify-center">
            <div className="relative w-full">
              <video ref={videoRef} playsInline muted className="w-full" style={{ maxHeight: "70vh", objectFit: "cover" }} />
              <BoardOverlay b={b} />
            </div>
          </div>
          <div className="pb-10 flex justify-center">
            <button
              onClick={shoot}
              aria-label="撮影"
              className="rounded-full"
              style={{ width: 74, height: 74, background: "#fff", border: `5px solid ${C.ki}` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
