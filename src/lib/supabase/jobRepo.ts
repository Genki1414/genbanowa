import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { Job, JobApplication, Availability } from "@/domain/job/Job";

export type Client = SupabaseClient<Database>;

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type JobApplicationRow = Database["public"]["Tables"]["job_applications"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availabilities"]["Row"];

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    keishiki: row.keishiki,
    jisu: row.jisu,
    industry: row.industry,
    area: row.area,
    siteAddress: row.site_address ?? undefined,
    scale: row.scale ?? undefined,
    kokiFrom: row.koki_from ?? undefined,
    kokiTo: row.koki_to ?? undefined,
    boshuFrom: row.boshu_from ?? undefined,
    boshuTo: row.boshu_to ?? undefined,
    priceMode: row.price_mode ?? undefined,
    price: row.price ?? 0,
    quoteDue: row.quote_due ?? undefined,
    tanka: row.tanka ?? 0,
    headcount: row.headcount ?? 0,
    paymentTerms: row.payment_terms ?? undefined,
    isPublicWork: row.is_public_work,
    status: row.status,
    postedAt: row.posted_at,
  };
}

function toApplication(row: JobApplicationRow): JobApplication {
  return {
    id: row.id,
    jobId: row.job_id,
    companyId: row.company_id,
    amount: row.amount ?? undefined,
    message: row.message ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    createdAt: row.created_at,
  };
}

function toAvailability(row: AvailabilityRow): Availability {
  return {
    id: row.id,
    companyId: row.company_id,
    kind: row.kind,
    industry: row.industry,
    area: row.area,
    fromDate: row.from_date,
    toDate: row.to_date,
    headcount: row.headcount ?? 0,
    tanka: row.tanka ?? 0,
    note: row.note ?? undefined,
    status: row.status,
    postedAt: row.posted_at,
  };
}

export interface JobListItem extends Job {
  companyName: string;
}

export interface JobDetail extends Job {
  companyName: string;
  trustLevel: string;
  trustScore: number;
}

/** 案件の会社名・信用レベルは自社しか見えないcompaniesではなく、公開ビューから引く。 */
async function attachCompanyNames(supabase: Client, jobs: Job[]): Promise<JobListItem[]> {
  if (jobs.length === 0) return [];
  const companyIds = [...new Set(jobs.map((j) => j.companyId))];
  const { data: companies } = await supabase.from("companies_public").select("id, name").in("id", companyIds);
  const nameById = new Map((companies ?? []).map((c) => [c.id, c.name]));
  return jobs.map((j) => ({ ...j, companyName: nameById.get(j.companyId) ?? "—" }));
}

export async function loadOpenJobs(supabase: Client): Promise<JobListItem[]> {
  const { data } = await supabase.from("jobs").select("*").eq("status", "open").order("posted_at", { ascending: false });
  return attachCompanyNames(supabase, (data ?? []).map(toJob));
}

export async function loadMyJobs(supabase: Client, companyId: string): Promise<JobListItem[]> {
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .order("posted_at", { ascending: false });
  return attachCompanyNames(supabase, (data ?? []).map(toJob));
}

export async function loadJob(supabase: Client, id: string): Promise<JobDetail | null> {
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const job = toJob(data);
  const { data: company } = await supabase
    .from("companies_public")
    .select("name, trust_level, trust_score")
    .eq("id", job.companyId)
    .maybeSingle();
  return {
    ...job,
    companyName: company?.name ?? "—",
    trustLevel: company?.trust_level ?? "未認証",
    trustScore: company?.trust_score ?? 0,
  };
}

export async function insertJob(
  supabase: Client,
  companyId: string,
  input: {
    name: string;
    keishiki: "ukeoi" | "ouen";
    jisu: "1次下請" | "2次下請" | "3次下請";
    industry: string;
    area: string;
    siteAddress?: string;
    scale?: string;
    kokiFrom?: string;
    kokiTo?: string;
    boshuFrom?: string;
    boshuTo?: string;
    priceMode?: "sashine" | "mitsumori";
    price?: number;
    quoteDue?: string;
    tanka?: number;
    headcount?: number;
    paymentTerms?: string;
    isPublicWork?: boolean;
  },
) {
  return supabase.from("jobs").insert({
    company_id: companyId,
    name: input.name,
    keishiki: input.keishiki,
    jisu: input.jisu,
    industry: input.industry,
    area: input.area,
    site_address: input.siteAddress ?? null,
    scale: input.scale ?? null,
    koki_from: input.kokiFrom ?? null,
    koki_to: input.kokiTo ?? null,
    boshu_from: input.boshuFrom ?? null,
    boshu_to: input.boshuTo ?? null,
    price_mode: input.priceMode ?? null,
    price: input.price ?? 0,
    quote_due: input.quoteDue ?? null,
    tanka: input.tanka ?? 0,
    headcount: input.headcount ?? 0,
    payment_terms: input.paymentTerms ?? null,
    is_public_work: input.isPublicWork ?? false,
  });
}

export async function updateJobStatus(supabase: Client, jobId: string, status: "open" | "paused" | "closed") {
  return supabase.from("jobs").update({ status }).eq("id", jobId);
}

export async function jobsPostedThisMonth(supabase: Client, companyId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("posted_at", monthStart);
  return count ?? 0;
}

export async function hasViewedJobDetail(supabase: Client, companyId: string, jobId: string): Promise<boolean> {
  const { data } = await supabase
    .from("job_detail_views")
    .select("job_id")
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .maybeSingle();
  return !!data;
}

export async function recordJobDetailView(supabase: Client, companyId: string, jobId: string) {
  return supabase.from("job_detail_views").insert({ company_id: companyId, job_id: jobId });
}

export async function detailViewsThisMonth(supabase: Client, companyId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await supabase
    .from("job_detail_views")
    .select("job_id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("viewed_at", monthStart);
  return count ?? 0;
}

export async function loadMyApplication(supabase: Client, jobId: string, companyId: string): Promise<JobApplication | null> {
  const { data } = await supabase
    .from("job_applications")
    .select("*")
    .eq("job_id", jobId)
    .eq("company_id", companyId)
    .maybeSingle();
  return data ? toApplication(data) : null;
}

export async function loadApplicationsForJob(supabase: Client, jobId: string): Promise<JobApplication[]> {
  const { data } = await supabase
    .from("job_applications")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(toApplication);
}

export async function insertApplication(
  supabase: Client,
  jobId: string,
  companyId: string,
  amount: number | undefined,
  message: string,
  conversationId: string,
) {
  return supabase.from("job_applications").insert({
    job_id: jobId,
    company_id: companyId,
    amount: amount ?? null,
    message,
    conversation_id: conversationId,
  });
}

export interface AvailabilityListItem extends Availability {
  companyName: string;
}

export async function loadOpenAvailabilities(supabase: Client): Promise<AvailabilityListItem[]> {
  const { data } = await supabase
    .from("availabilities")
    .select("*")
    .eq("status", "open")
    .order("posted_at", { ascending: false });
  const availabilities = (data ?? []).map(toAvailability);
  if (availabilities.length === 0) return [];

  const companyIds = [...new Set(availabilities.map((a) => a.companyId))];
  const { data: companies } = await supabase.from("companies_public").select("id, name").in("id", companyIds);
  const nameById = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return availabilities.map((a) => ({ ...a, companyName: nameById.get(a.companyId) ?? "—" }));
}

export async function loadAvailability(supabase: Client, id: string): Promise<Availability | null> {
  const { data } = await supabase.from("availabilities").select("*").eq("id", id).maybeSingle();
  return data ? toAvailability(data) : null;
}

export async function loadMyAvailabilities(supabase: Client, companyId: string): Promise<Availability[]> {
  const { data } = await supabase
    .from("availabilities")
    .select("*")
    .eq("company_id", companyId)
    .order("posted_at", { ascending: false });
  return (data ?? []).map(toAvailability);
}

export async function insertAvailability(
  supabase: Client,
  companyId: string,
  input: {
    kind: "ninku" | "waku";
    industry: string;
    area: string;
    fromDate: string;
    toDate: string;
    headcount?: number;
    tanka?: number;
    note?: string;
  },
) {
  return supabase.from("availabilities").insert({
    company_id: companyId,
    kind: input.kind,
    industry: input.industry,
    area: input.area,
    from_date: input.fromDate,
    to_date: input.toDate,
    headcount: input.headcount ?? 0,
    tanka: input.tanka ?? 0,
    note: input.note ?? null,
  });
}

export async function withdrawAvailability(supabase: Client, id: string) {
  return supabase.from("availabilities").update({ status: "withdrawn" }).eq("id", id);
}

export async function openAvailabilityCount(supabase: Client, companyId: string): Promise<number> {
  const { count } = await supabase
    .from("availabilities")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "open");
  return count ?? 0;
}
