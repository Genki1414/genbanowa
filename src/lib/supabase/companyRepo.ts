import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Json, TrustDocKind } from "./database.types";
import {
  CompanyProfile,
  CompanyStats,
  CompanyRating,
  CompanyPayment,
  TrustDocChecklistItem,
  CompanyEditableProfile,
} from "@/domain/company/Company";

export type Client = SupabaseClient<Database>;

export async function loadOwnCompanyProfile(supabase: Client, companyId: string): Promise<CompanyEditableProfile | null> {
  const { data } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    kana: data.kana ?? undefined,
    repName: data.rep_name ?? undefined,
    established: data.established ?? undefined,
    postal: data.postal ?? undefined,
    address: data.address ?? undefined,
    tel: data.tel ?? undefined,
    url: data.url ?? undefined,
    industries: data.industries ?? [],
    serviceAreas: data.service_areas ?? [],
    stance: data.stance,
    invoiceApprovalLimit: data.invoice_approval_limit,
  };
}

export async function updateCompanyProfile(supabase: Client, companyId: string, input: CompanyEditableProfile) {
  return supabase
    .from("companies")
    .update({
      name: input.name,
      kana: input.kana ?? null,
      rep_name: input.repName ?? null,
      established: input.established ?? null,
      postal: input.postal ?? null,
      address: input.address ?? null,
      tel: input.tel ?? null,
      url: input.url ?? null,
      industries: input.industries,
      service_areas: input.serviceAreas,
      stance: input.stance,
      invoice_approval_limit: input.invoiceApprovalLimit,
    })
    .eq("id", companyId);
}

export async function loadCompanyProfile(supabase: Client, id: string): Promise<CompanyProfile | null> {
  const { data } = await supabase.from("companies_public").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    repName: data.rep_name ?? undefined,
    established: data.established ?? undefined,
    area: data.area ?? undefined,
    industries: data.industries ?? [],
    serviceAreas: data.service_areas ?? [],
    licenseNo: data.license_no ?? undefined,
    trustScore: data.trust_score,
    trustLevel: data.trust_level,
    approvedDocKinds: data.approved_doc_kinds ?? [],
  };
}

export async function loadCompanyStats(supabase: Client, id: string): Promise<CompanyStats> {
  const { data } = await supabase.from("companies_stats").select("*").eq("company_id", id).maybeSingle();
  return {
    hacchuCount: data?.hacchu_count ?? 0,
    jucchuCount: data?.jucchu_count ?? 0,
    partnerCount: data?.partner_count ?? 0,
  };
}

export async function loadCompanyRating(supabase: Client, id: string): Promise<CompanyRating | null> {
  const { data } = await supabase.from("companies_rating").select("*").eq("company_id", id).maybeSingle();
  return data ? { stars: data.stars, note: data.note ?? undefined } : null;
}

export async function loadCompanyUrl(supabase: Client, id: string): Promise<string | null> {
  const { data } = await supabase.from("companies_url").select("url").eq("company_id", id).maybeSingle();
  return data?.url ?? null;
}

export async function loadCompanyPayment(supabase: Client, id: string): Promise<CompanyPayment> {
  const { data } = await supabase.from("companies_payment").select("*").eq("company_id", id).maybeSingle();
  return { ontimeCount: data?.ontime_count ?? 0, delayCount: data?.delay_count ?? 0 };
}

/** 自社の書類提出チェックリスト。他社の提出状況（pending/rejectedの理由等）は見せない。 */
export async function loadTrustDocChecklist(supabase: Client, companyId: string): Promise<TrustDocChecklistItem[]> {
  const [{ data: points }, { data: docs }] = await Promise.all([
    supabase.from("trust_doc_points").select("*").order("points", { ascending: false }),
    supabase.from("trust_documents").select("kind, status, reject_note").eq("company_id", companyId),
  ]);
  const docByKind = new Map((docs ?? []).map((d) => [d.kind, d]));
  return (points ?? []).map((p) => ({
    kind: p.kind,
    label: p.label,
    points: p.points,
    status: docByKind.get(p.kind)?.status ?? "not_submitted",
    rejectNote: docByKind.get(p.kind)?.reject_note ?? undefined,
  }));
}

/**
 * 書類の提出・再提出。company_id は my_company() で内部的に決まる（submit_trust_document、
 * 0019_trust_document_review.sql）。却下（rejected）状態のときだけ再提出扱いで上書きされ、
 * pending/approved のときは何もしない（送信後に変更できない原則）。
 */
export async function insertTrustDocument(supabase: Client, kind: TrustDocKind, value?: string, values?: Record<string, unknown>) {
  return supabase.rpc("submit_trust_document", { p_kind: kind, p_value: value ?? null, p_values: (values as Json) ?? null });
}
