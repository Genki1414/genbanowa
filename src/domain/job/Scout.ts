export type ScoutKind = "scout" | "quote_request";

export interface Scout {
  id: string;
  fromCompanyId: string;
  toCompanyId: string;
  kind: ScoutKind;
  jobId?: string;
  availabilityId?: string;
  message: string;
  openedAt: string | null;
  repliedAt: string | null;
  createdAt: string;
}
