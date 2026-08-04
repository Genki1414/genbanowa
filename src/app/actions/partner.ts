"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { insertPartner, insertStandaloneDocument } from "@/lib/supabase/partnerRepo";
import { StandaloneDocumentKind } from "@/domain/company/Partner";

export async function addPartnerAction(input: {
  name: string;
  contactName?: string;
  closingDay?: string;
  paymentTerms?: string;
  email?: string;
  tel?: string;
}): Promise<Result<{ partnerId: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "partner.manage")) return err("PERMISSION_DENIED");
  if (!input.name.trim()) return err("EMPTY_NAME");

  const supabase = await createClient();
  const { data, error } = await insertPartner(supabase, actor.companyId, input);
  if (error) return err(error.message);

  revalidatePath("/partners");
  return ok({ partnerId: data.id });
}

/**
 * アプリ外の取引先向けに単独で書類を発行する。取引（Transaction）を経由しない一発書類だが、
 * 「書類の発行」であることに変わりはないので document.issue のクォータは同じく適用する
 * （CLAUDE.md「絶対に守ること」7：判定は checkQuota() と can() に集約する）。
 */
export async function issueStandaloneDocumentAction(input: {
  partnerId?: string;
  kind: StandaloneDocumentKind;
  title: string;
  siteAddress?: string;
  koki?: string;
  amount: number;
  tax: number;
}): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "partner.manage")) return err("PERMISSION_DENIED");
  if (!input.title.trim()) return err("EMPTY_TITLE");

  const supabase = await createClient();
  const plan = await getCompanyPlan(supabase, actor.companyId);
  const quota = checkQuota(plan, emptyUsage(), "document.issue");
  if (!quota.ok) return err(quota.reason);

  const { error } = await insertStandaloneDocument(supabase, actor.companyId, input);
  if (error) return err(error.message);

  revalidatePath("/partners");
  if (input.partnerId) revalidatePath(`/partners/${input.partnerId}`);
  return ok(null);
}
