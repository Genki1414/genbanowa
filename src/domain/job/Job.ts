/**
 * 案件・応募・空き情報。取引と違って複雑な状態遷移を持たないので、
 * 型と純粋関数だけを置く（Transaction のようなクラスは作らない）。
 */
export type JobKeishiki = "ukeoi" | "ouen";
export type JobStatus = "open" | "paused" | "closed";
/** 受注する側の下請次数。単価に直結する重要情報として募集時に必須で申告してもらう。 */
export type SubcontractTier = "1次下請" | "2次下請" | "3次下請";

export interface Job {
  id: string;
  companyId: string;
  name: string;
  keishiki: JobKeishiki;
  jisu: SubcontractTier;
  industry: string;
  area: string;
  siteAddress?: string;
  scale?: string;
  kokiFrom?: string;
  kokiTo?: string;
  boshuFrom?: string;
  boshuTo?: string;
  priceMode?: "sashine" | "mitsumori";
  price: number;
  quoteDue?: string;
  tanka: number;
  headcount: number;
  paymentTerms?: string;
  isPublicWork: boolean;
  status: JobStatus;
  postedAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  companyId: string;
  amount?: number;
  message?: string;
  conversationId?: string;
  createdAt: string;
}

export type AvailabilityKind = "ninku" | "waku";
export type AvailabilityStatus = "open" | "withdrawn" | "expired";

export interface Availability {
  id: string;
  companyId: string;
  kind: AvailabilityKind;
  industry: string;
  area: string;
  fromDate: string;
  toDate: string;
  headcount: number;
  tanka: number;
  note?: string;
  status: AvailabilityStatus;
  postedAt: string;
}

/** 自社の案件には応募できない。募集終了・停止中の案件にも応募できない。 */
export function canApply(job: Job, applicantCompanyId: string): boolean {
  return job.companyId !== applicantCompanyId && job.status === "open";
}
