"use client";

import { useEffect, useRef } from "react";
import { C } from "@/styles/tokens";
import { burnBoard, BoardData } from "./blackboard";

/** 黒板の仕上がり見本（足場のイラスト＋黒板）。カメラを使わなくても見た目を確認できる。 */
export function BoardPreview({ b }: { b: BoardData }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#9BB6C9");
    sky.addColorStop(1, "#C8D2D6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#8A8F8B";
    ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.fillStyle = "#DAD6CC";
    ctx.fillRect(W * 0.18, H * 0.2, W * 0.6, H * 0.52);
    ctx.strokeStyle = "rgba(40,44,48,.55)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 6; i++) {
      const px = W * 0.16 + ((W * 0.64) / 6) * i;
      ctx.beginPath();
      ctx.moveTo(px, H * 0.16);
      ctx.lineTo(px, H * 0.74);
      ctx.stroke();
    }
    for (let j = 0; j <= 3; j++) {
      const py = H * 0.16 + ((H * 0.58) / 3) * j;
      ctx.beginPath();
      ctx.moveTo(W * 0.16, py);
      ctx.lineTo(W * 0.8, py);
      ctx.stroke();
    }
    burnBoard(ctx, W, H, b);
  }, [b]);

  return <canvas ref={ref} width={640} height={420} className="w-full rounded-sm" style={{ border: `1px solid ${C.keisen}` }} />;
}
