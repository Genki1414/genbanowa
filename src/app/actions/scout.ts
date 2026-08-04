"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { checkQuota, checkScoutView } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { insertScout, scoutsSentThisMonth, loadScout } from "@/lib/supabase/scoutRepo";
import { ScoutKind } from "@/domain/job/Scout";

export async function sendScoutAction(input: {
  toCompanyId: string;
  kind: ScoutKind;
  message: string;
  jobId?: string;
  availabilityId?: string;
}): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "scout.send")) return err("PERMISSION_DENIED");
  if (input.toCompanyId === actor.companyId) return err("CANNOT_SCOUT_SELF");
  if (!input.message.trim()) return err("EMPTY_MESSAGE");

  const supabase = await createClient();
  const plan = await getCompanyPlan(supabase, actor.companyId);
  const sent = await scoutsSentThisMonth(supabase, actor.companyId);
  const quota = checkQuota(plan, { ...emptyUsage(), scoutsSentThisMonth: sent }, "scout.send");
  if (!quota.ok) return err(quota.reason);

  const { error } = await insertScout(supabase, actor.companyId, input.toCompanyId, input.kind, input.message, input.jobId, input.availabilityId);
  if (error) return err(error.message);

  revalidatePath("/scouts/sent");
  return ok(null);
}

/**
 * スカウトの閲覧。無料プランは閲覧ポイントを消費する（プロフィールを充実させると増える）。
 * 有料プランは無制限（CLAUDE.md用語・docs/01 3章「無料はポイント消費、有料は無制限」）。
 * ポイント切れの判定はここ（アプリ層）で行い、実際の消費は consume_invite_point() が
 * 冪等に行う（RPC自体は0未満にはならないだけで拒否はしないため、事前判定が必須）。
 */
export async function openScoutAction(scoutId: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "scout.read")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const scout = await loadScout(supabase, scoutId);
  if (!scout) return err("SCOUT_NOT_FOUND");
  if (scout.toCompanyId !== actor.companyId) return err("NOT_RECIPIENT");

  if (!scout.openedAt) {
    const [plan, { data: company }] = await Promise.all([
      getCompanyPlan(supabase, actor.companyId),
      supabase.from("companies").select("invite_points").eq("id", actor.companyId).maybeSingle(),
    ]);
    const quota = checkScoutView(plan, company?.invite_points ?? 0, false);
    if (!quota.ok) return err(quota.reason);
  }

  const { error } = await supabase.rpc("consume_invite_point", { p_scout_id: scoutId });
  if (error) return err(error.message);

  revalidatePath("/scouts");
  return ok(null);
}
