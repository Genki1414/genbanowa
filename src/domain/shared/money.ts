/** 税抜金額から日本円表記を作る。円未満は四捨五入。 */
export const yen = (n: number | null | undefined): string => "¥" + (Number(n) || 0).toLocaleString("ja-JP");

/** 消費税額（10%固定・円未満切り捨て）。 */
export const tax = (amount: number, rate = 0.1): number => Math.floor((Number(amount) || 0) * rate);

export const round = (n: number): number => Math.round(Number(n) || 0);
