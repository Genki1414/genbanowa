import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TrustDocKind } from "./database.types";
import { CompanyProfile, CompanyStats, CompanyRating, CompanyPayment, TrustDocChecklistItem } from "@/domain/company/Company";

export type Client = SupabaseClient<Database>;

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
    supabase.from("trust_documents").select("kind, status").eq("company_id", companyId),
  ]);
  const statusByKind = new Map((docs ?? []).map((d) => [d.kind, d.status]));
  return (points ?? []).map((p) => ({
    kind: p.kind,
    label: p.label,
    points: p.points,
    status: statusByKind.get(p.kind) ?? "not_submitted",
  }));
}

export async function insertTrustDocument(supabase: Client, companyId: string, kind: TrustDocKind, value?: string) {
  return supabase.from("trust_documents").insert({
    company_id: companyId,
    kind,
    value: value ?? null,
  });
}
