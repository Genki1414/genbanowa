"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { Koutei } from "@/domain/site/Site";
import { insertSite, archiveSite, activeSiteCount, loadSite, insertPhoto } from "@/lib/supabase/siteRepo";

export async function createSiteAction(input: {
  name: string;
  address?: string;
  transactionId?: string;
}): Promise<Result<{ id: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "site.create")) return err("PERMISSION_DENIED");
  if (!input.name.trim()) return err("EMPTY_NAME");

  const supabase = await createClient();

  if (input.transactionId) {
    const { data: tx } = await supabase.from("transactions").select("id").eq("id", input.transactionId).maybeSingle();
    if (!tx) return err("TRANSACTION_NOT_FOUND");
  }

  const plan = await getCompanyPlan(supabase, actor.companyId);
  const active = await activeSiteCount(supabase, actor.companyId);
  const quota = checkQuota(plan, { ...emptyUsage(), activeSiteCount: active }, "site.slot");
  if (!quota.ok) return err(quota.reason);

  const { data, error } = await insertSite(supabase, actor.companyId, input);
  if (error) return err(error.message);

  revalidatePath("/sites");
  return ok({ id: data.id });
}

/** 「削除」は archived_at を立てるだけ。撮影済みの写真は失われない（CLAUDE.md「絶対に守ること」4と同じ考え方）。 */
export async function archiveSiteAction(id: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "site.delete")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const site = await loadSite(supabase, id);
  if (!site) return err("SITE_NOT_FOUND");
  if (site.companyId !== actor.companyId) return err("NOT_OWN_SITE");

  const { error } = await archiveSite(supabase, id);
  if (error) return err(error.message);

  revalidatePath("/sites");
  return ok(null);
}

/**
 * 写真本体はクライアントから直接 Supabase Storage（site-photosバケット）へ
 * アップロード済みの前提（storage.objectsのRLSが撮影権限を守る）。
 * ここではメタデータ行の作成だけを行う。
 */
export async function savePhotoAction(
  siteId: string,
  input: { koushu: string; koutei: Koutei; spot?: string; shotAt: string; filePath: string },
): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "photo.capture")) return err("PERMISSION_DENIED");
  if (!input.koushu.trim()) return err("EMPTY_KOUSHU");

  const supabase = await createClient();
  const site = await loadSite(supabase, siteId);
  if (!site) return err("SITE_NOT_FOUND");

  const { error } = await insertPhoto(supabase, siteId, input);
  if (error) return err(error.message);

  revalidatePath(`/sites/${siteId}`);
  return ok(null);
}
