/**
 * ゲンバノワ デザイントークン。
 * 色の意味は固定。アプリ内に凡例（Legend）を出しているため、ここ以外に色を書かない。
 * prototype/kyoryoku-network-prototype.jsx の `C` オブジェクトと同じ値。
 */
export const C = {
  sumi: "#14171C", // 墨 — 文字・ヘッダ
  kami: "#FFFFFF", // 紙 — カード
  yojo: "#E9EDEA", // 養生 — 下地
  keisen: "#D6DBD7", // 罫線
  ki: "#F5C518", // 安全黄 — 進行中・アクセント
  midori: "#00874A", // 安全緑 — 完了・良好
  aka: "#D22630", // 安全赤 — 対応待ち・警告
  usu: "#6B7280", // 副文字・終了
} as const;

export const TONE = {
  action: C.aka, // あなたの対応待ち
  active: C.ki, // 進行中
  done: C.midori, // 完了・良好
  off: C.usu, // 終了・停止
} as const;

export const FONT =
  "'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',system-ui,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace";

export type ToneKey = keyof typeof TONE;
export type ColorKey = keyof typeof C;
