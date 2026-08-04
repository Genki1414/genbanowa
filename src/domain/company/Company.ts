/**
 * 会社ページ・信用スコア。CompanyProfile は companies_public ビュー相当で、
 * 集計値（取引実績・評価・支払実績）はプラン別ビューから別途合成する。
 */
export interface CompanyProfile {
  id: string;
  name: string;
  type: "corp" | "sole";
  repName?: string;
  established?: string;
  area?: string;
  industries: string[];
  serviceAreas: string[];
  licenseNo?: string;
  trustScore: number;
  trustLevel: string;
  approvedDocKinds: string[];
}

export interface CompanyStats {
  hacchuCount: number;
  jucchuCount: number;
  partnerCount: number;
}

export interface CompanyRating {
  stars: number;
  note?: string;
}

export interface CompanyPayment {
  ontimeCount: number;
  delayCount: number;
}

export interface TrustDocPoint {
  kind: string;
  label: string;
  points: number;
}

export type TrustDocStatus = "not_submitted" | "pending" | "approved" | "rejected";

export interface TrustDocChecklistItem extends TrustDocPoint {
  status: TrustDocStatus;
}

/**
 * 自社の会社ページで見せる開示レベル（0=基本 1=取引実績 2=+運営評価/HP 3=+支払実績）。
 * PlanLimits.info をそのまま使う。
 */
export function canSeeStats(infoLevel: 0 | 1 | 2 | 3): boolean {
  return infoLevel >= 1;
}

export function canSeeRating(infoLevel: 0 | 1 | 2 | 3): boolean {
  return infoLevel >= 2;
}

export function canSeePayment(infoLevel: 0 | 1 | 2 | 3): boolean {
  return infoLevel >= 3;
}
