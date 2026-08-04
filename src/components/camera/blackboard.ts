/**
 * 黒板合成。写真ファイル・ライブカメラの両方から共通で使う純粋なCanvas処理。
 * プロトタイプの burnBoard / burnFile をそのまま移植（見た目を変えない）。
 */
const FONT = "'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',system-ui,sans-serif";

export interface BoardData {
  kouji: string;
  koushu: string;
  koutei: string;
  basho: string;
}

export function boardLines(b: BoardData): [string, string][] {
  return [
    ["工事名", b.kouji || "—"],
    ["工　種", b.koushu || "—"],
    ["工　程", b.koutei || "—"],
    ["撮影箇所", b.basho || "—"],
    ["撮影日", new Date().toLocaleDateString("ja-JP")],
  ];
}

export function burnBoard(ctx: CanvasRenderingContext2D, w: number, h: number, b: BoardData): void {
  const bw = w * 0.54;
  const bh = h * 0.42;
  const bx = w * 0.03;
  const by = h - bh - h * 0.035;
  ctx.fillStyle = "#1E3A2F";
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = "#E8E3D3";
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 4, by + 4, bw - 8, bh - 8);
  ctx.font = `bold ${Math.round(bh * 0.115)}px ${FONT}`;
  boardLines(b).forEach(([k, v], i) => {
    const ty = by + bh * 0.19 + i * (bh * 0.155);
    ctx.fillStyle = "#B9CFC2";
    ctx.fillText(k, bx + 14, ty);
    ctx.fillStyle = "#F2EFE4";
    ctx.fillText(String(v).slice(0, 14), bx + bw * 0.34, ty);
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("画像の書き出しに失敗しました"))), "image/jpeg", quality);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

/** 選択済みの画像ファイルに黒板を焼き込み、JPEGのBlobを返す。 */
export async function burnFile(file: File, b: BoardData): Promise<Blob> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasの初期化に失敗しました");
  ctx.drawImage(img, 0, 0);
  burnBoard(ctx, canvas.width, canvas.height, b);
  return canvasToBlob(canvas);
}
