import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { Partner, StandaloneDocument, StandaloneDocumentKind } from "@/domain/company/Partner";

export type Client = SupabaseClient<Database>;

type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];
type StandaloneDocumentRow = Database["public"]["Tables"]["standalone_documents"]["Row"];

function toPartner(row: PartnerRow): Partner {
  return {
    id: row.id,
    companyId: row.company_id,
    linkedCompanyId: row.linked_company ?? undefined,
    name: row.name,
    contactName: row.contact_name ?? undefined,
    closingDay: row.closing_day ?? undefined,
    paymentTerms: row.payment_terms ?? undefined,
    email: row.email ?? undefined,
    tel: row.tel ?? undefined,
    createdAt: row.created_at,
  };
}

function toStandaloneDocument(row: StandaloneDocumentRow): StandaloneDocument {
  return {
    id: row.id,
    companyId: row.company_id,
    partnerId: row.partner_id ?? undefined,
    kind: row.kind,
    title: row.title,
    siteAddress: row.site_address ?? undefined,
    koki: row.koki ?? undefined,
    amount: row.amount,
    tax: row.tax,
    createdAt: row.created_at,
  };
}

export async function loadPartners(supabase: Client, companyId: string): Promise<Partner[]> {
  const { data } = await supabase.from("partners").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  return (data ?? []).map(toPartner);
}

export async function loadPartner(supabase: Client, id: string): Promise<Partner | null> {
  const { data } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();
  return data ? toPartner(data) : null;
}

export async function insertPartner(
  supabase: Client,
  companyId: string,
  input: { name: string; contactName?: string; closingDay?: string; paymentTerms?: string; email?: string; tel?: string },
) {
  return supabase
    .from("partners")
    .insert({
      company_id: companyId,
      name: input.name,
      contact_name: input.contactName ?? null,
      closing_day: input.closingDay ?? null,
      payment_terms: input.paymentTerms ?? null,
      email: input.email ?? null,
      tel: input.tel ?? null,
    })
    .select("id")
    .single();
}

export async function loadStandaloneDocuments(supabase: Client, companyId: string, partnerId?: string): Promise<StandaloneDocument[]> {
  let query = supabase.from("standalone_documents").select("*").eq("company_id", companyId);
  if (partnerId) query = query.eq("partner_id", partnerId);
  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []).map(toStandaloneDocument);
}

export async function insertStandaloneDocument(
  supabase: Client,
  companyId: string,
  input: {
    partnerId?: string;
    kind: StandaloneDocumentKind;
    title: string;
    siteAddress?: string;
    koki?: string;
    amount: number;
    tax: number;
  },
) {
  return supabase.from("standalone_documents").insert({
    company_id: companyId,
    partner_id: input.partnerId ?? null,
    kind: input.kind,
    title: input.title,
    site_address: input.siteAddress ?? null,
    koki: input.koki ?? null,
    amount: input.amount,
    tax: input.tax,
    sent_at: new Date().toISOString(),
  });
}
