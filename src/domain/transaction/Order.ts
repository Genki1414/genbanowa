/**
 * 注文書。1取引に複数枚（追加工事は2枚目以降）。送信後は immutable — 訂正は差し戻しか新規発行。
 */
export type OrderKeishiki = "ukeoi" | "ninku"; // 請負／人工

export interface Order {
  id: string;
  seq: number; // No.1, No.2 ...
  keishiki: OrderKeishiki;
  amount: number; // 請負代金（税抜）。人工契約では0
  tanka: number; // 人工単価。請負契約では0
  kokiFrom: string;
  kokiTo: string;
  siteAddress?: string;
  paymentTerms: string;
  note?: string;
  issuedAt: string;
  acceptedAt: string | null; // 注文請書の返送
  rejectedAt: string | null; // 差し戻し
  rejectNote?: string;
}

export const isAccepted = (order: Order): boolean => order.acceptedAt !== null;
export const isRejected = (order: Order): boolean => order.rejectedAt !== null;
export const isPending = (order: Order): boolean => !isAccepted(order) && !isRejected(order);

export const nextSeq = (orders: Order[]): number => orders.reduce((n, o) => Math.max(n, o.seq), 0) + 1;
