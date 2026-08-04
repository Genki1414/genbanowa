/**
 * アプリ非会員の取引先向けに、取引（Transaction）を経由せず単独で発行する書類。
 * 普段付き合いのある元請・協力会社との、アプリ外の仕事用。
 * 取引の記録（メッセージ起点・状態遷移）は持たない一発書類なので、Transaction とは別の集約にする。
 */
export interface Partner {
  id: string;
  companyId: string;
  linkedCompanyId?: string;
  name: string;
  contactName?: string;
  closingDay?: string;
  paymentTerms?: string;
  email?: string;
  tel?: string;
  createdAt: string;
}

export type StandaloneDocumentKind = "estimate" | "order" | "invoice";

export interface StandaloneDocument {
  id: string;
  companyId: string;
  partnerId?: string;
  kind: StandaloneDocumentKind;
  title: string;
  siteAddress?: string;
  koki?: string;
  amount: number;
  tax: number;
  createdAt: string;
}
