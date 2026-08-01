/**
 * 追加工事の注文書依頼。field ロールでも起票できる唯一の「金額に触れる」操作だが、
 * 金額は「概算」であり注文書そのものではない（気づいた人がその場で申請できることを優先）。
 */
export type OrderRequestStatus = "requested" | "issued" | "declined";

export interface OrderRequest {
  id: string;
  description: string;
  estAmount: number;
  kokiFrom?: string;
  kokiTo?: string;
  status: OrderRequestStatus;
  issuedOrderId: string | null;
  createdAt: string;
}
