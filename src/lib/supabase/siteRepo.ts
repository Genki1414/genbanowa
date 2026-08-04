import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { Site, Photo } from "@/domain/site/Site";

export type Client = SupabaseClient<Database>;

type SiteRow = Database["public"]["Tables"]["sites"]["Row"];
type PhotoRow = Database["public"]["Tables"]["photos"]["Row"];

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    companyId: row.company_id,
    transactionId: row.transaction_id ?? undefined,
    name: row.name,
    address: row.address ?? undefined,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    siteId: row.site_id,
    koushu: row.koushu,
    koutei: row.koutei,
    spot: row.spot ?? undefined,
    shotAt: row.shot_at,
    filePath: row.file_path,
    createdAt: row.created_at,
  };
}

export interface SiteListItem extends Site {
  photoCount: number;
}

/** 自社の現場フォルダ一覧。アーカイブ済みは含めない。 */
export async function loadMySites(supabase: Client, companyId: string): Promise<SiteListItem[]> {
  const { data } = await supabase
    .from("sites")
    .select("*")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  const sites = (data ?? []).map(toSite);
  if (sites.length === 0) return [];

  const { data: photoRows } = await supabase
    .from("photos")
    .select("site_id")
    .in("site_id", sites.map((s) => s.id));
  const countBySite = new Map<string, number>();
  for (const p of photoRows ?? []) {
    countBySite.set(p.site_id, (countBySite.get(p.site_id) ?? 0) + 1);
  }

  return sites.map((s) => ({ ...s, photoCount: countBySite.get(s.id) ?? 0 }));
}

export async function loadSite(supabase: Client, id: string): Promise<Site | null> {
  const { data } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
  return data ? toSite(data) : null;
}

export async function insertSite(
  supabase: Client,
  companyId: string,
  input: { name: string; address?: string; transactionId?: string },
) {
  return supabase
    .from("sites")
    .insert({ company_id: companyId, name: input.name, address: input.address ?? null, transaction_id: input.transactionId ?? null })
    .select("id")
    .single();
}

export async function archiveSite(supabase: Client, id: string) {
  return supabase.from("sites").update({ archived_at: new Date().toISOString() }).eq("id", id);
}

export async function activeSiteCount(supabase: Client, companyId: string): Promise<number> {
  const { count } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("archived_at", null);
  return count ?? 0;
}

/** すでに現場フォルダを作った取引のID一覧（「受注中の現場から選ぶ」で作成済みを弾くため）。 */
export async function siteTransactionIds(supabase: Client, companyId: string): Promise<string[]> {
  const { data } = await supabase.from("sites").select("transaction_id").eq("company_id", companyId).not("transaction_id", "is", null);
  return (data ?? []).map((r) => r.transaction_id).filter((id): id is string => !!id);
}

export interface SiteCandidate {
  transactionId: string;
  title: string;
  partnerCompanyName: string;
  siteAddress?: string;
}

/** 「受注中の現場から選ぶ」用。自社が受注側で、まだ現場フォルダを作っていない取引。 */
export async function loadSiteCandidates(supabase: Client, companyId: string): Promise<SiteCandidate[]> {
  const { data: txRows } = await supabase
    .from("transactions")
    .select("id, title, moto_company, status")
    .eq("uke_company", companyId)
    .in("status", ["active", "completion_requested"])
    .order("created_at", { ascending: false });
  if (!txRows || txRows.length === 0) return [];

  const usedIds = new Set(await siteTransactionIds(supabase, companyId));
  const candidates = txRows.filter((t) => !usedIds.has(t.id));
  if (candidates.length === 0) return [];

  const ids = candidates.map((t) => t.id);
  const [{ data: orderRows }, { data: partnerRows }] = await Promise.all([
    supabase.from("orders").select("transaction_id, site_address").in("transaction_id", ids).order("seq", { ascending: true }),
    supabase.from("companies_public").select("id, name").in("id", candidates.map((t) => t.moto_company)),
  ]);
  const addressByTx = new Map<string, string>();
  for (const o of orderRows ?? []) {
    if (!addressByTx.has(o.transaction_id) && o.site_address) addressByTx.set(o.transaction_id, o.site_address);
  }
  const nameById = new Map((partnerRows ?? []).map((c) => [c.id, c.name]));

  return candidates.map((t) => ({
    transactionId: t.id,
    title: t.title,
    partnerCompanyName: nameById.get(t.moto_company) ?? "—",
    siteAddress: addressByTx.get(t.id) ?? undefined,
  }));
}

export async function loadPhotos(supabase: Client, siteId: string): Promise<Photo[]> {
  const { data } = await supabase.from("photos").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
  return (data ?? []).map(toPhoto);
}

export async function insertPhoto(
  supabase: Client,
  siteId: string,
  input: { koushu: string; koutei: Photo["koutei"]; spot?: string; shotAt: string; filePath: string },
) {
  return supabase.from("photos").insert({
    site_id: siteId,
    koushu: input.koushu,
    koutei: input.koutei,
    spot: input.spot ?? null,
    shot_at: input.shotAt,
    file_path: input.filePath,
  });
}
