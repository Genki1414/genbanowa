import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { Scout, ScoutKind } from "@/domain/job/Scout";

export type Client = SupabaseClient<Database>;

type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"];

function toScout(row: ScoutRow): Scout {
  return {
    id: row.id,
    fromCompanyId: row.from_company,
    toCompanyId: row.to_company,
    kind: row.kind,
    jobId: row.job_id ?? undefined,
    availabilityId: row.availability_id ?? undefined,
    message: row.message,
    openedAt: row.opened_at,
    repliedAt: row.replied_at,
    createdAt: row.created_at,
  };
}

export async function loadReceivedScouts(supabase: Client, companyId: string): Promise<Scout[]> {
  const { data } = await supabase.from("scouts").select("*").eq("to_company", companyId).order("created_at", { ascending: false });
  return (data ?? []).map(toScout);
}

export async function loadSentScouts(supabase: Client, companyId: string): Promise<Scout[]> {
  const { data } = await supabase.from("scouts").select("*").eq("from_company", companyId).order("created_at", { ascending: false });
  return (data ?? []).map(toScout);
}

export async function loadScout(supabase: Client, id: string): Promise<Scout | null> {
  const { data } = await supabase.from("scouts").select("*").eq("id", id).maybeSingle();
  return data ? toScout(data) : null;
}

export async function scoutsSentThisMonth(supabase: Client, companyId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await supabase
    .from("scouts")
    .select("id", { count: "exact", head: true })
    .eq("from_company", companyId)
    .gte("created_at", monthStart);
  return count ?? 0;
}

export async function insertScout(
  supabase: Client,
  fromCompanyId: string,
  toCompanyId: string,
  kind: ScoutKind,
  message: string,
  jobId?: string,
  availabilityId?: string,
) {
  return supabase.from("scouts").insert({
    from_company: fromCompanyId,
    to_company: toCompanyId,
    kind,
    job_id: jobId ?? null,
    availability_id: availabilityId ?? null,
    message,
  });
}
