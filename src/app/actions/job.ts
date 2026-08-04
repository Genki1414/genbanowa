"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";
import { canApply } from "@/domain/job/Job";
import {
  insertJob,
  updateJobStatus,
  jobsPostedThisMonth,
  loadJob,
  hasViewedJobDetail,
  recordJobDetailView,
  detailViewsThisMonth,
  loadMyApplication,
  insertApplication,
  insertAvailability,
  withdrawAvailability,
  openAvailabilityCount,
} from "@/lib/supabase/jobRepo";
import { findExistingConversation, conversationsStartedThisMonth, insertMessage } from "@/lib/supabase/conversationRepo";

export async function postJobAction(input: {
  name: string;
  keishiki: "ukeoi" | "ouen";
  industry: string;
  area: string;
  siteAddress?: string;
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
}): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "job.post")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const plan = await getCompanyPlan(supabase, actor.companyId);
  const posted = await jobsPostedThisMonth(supabase, actor.companyId);
  const quota = checkQuota(plan, { ...emptyUsage(), jobsPostedThisMonth: posted }, "job.post");
  if (!quota.ok) return err(quota.reason);

  const { error } = await insertJob(supabase, actor.companyId, input);
  if (error) return err(error.message);

  revalidatePath("/jobs");
  return ok(null);
}

export async function updateJobStatusAction(jobId: string, status: "open" | "paused" | "closed"): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();
  const job = await loadJob(supabase, jobId);
  if (!job) return err("JOB_NOT_FOUND");
  if (job.companyId !== actor.companyId) return err("NOT_OWN_JOB");
  if (!can(actor.role, "job.post")) return err("PERMISSION_DENIED");

  const { error } = await updateJobStatus(supabase, jobId, status);
  if (error) return err(error.message);

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  return ok(null);
}

/**
 * 案件詳細の閲覧を記録する。同じ案件の再閲覧は消費しない
 * （checkQuota()のコメント参照：呼び出し側が既知かどうかを事前に判定する）。
 */
export async function recordJobDetailViewAction(jobId: string): Promise<Result<null>> {
  const actor = await requireActor();
  const supabase = await createClient();

  const already = await hasViewedJobDetail(supabase, actor.companyId, jobId);
  if (already) return ok(null);

  const plan = await getCompanyPlan(supabase, actor.companyId);
  const viewed = await detailViewsThisMonth(supabase, actor.companyId);
  const quota = checkQuota(plan, { ...emptyUsage(), detailViewedCount: viewed }, "job.detail");
  if (!quota.ok) return err(quota.reason);

  const { error } = await recordJobDetailView(supabase, actor.companyId, jobId);
  if (error) return err(error.message);
  return ok(null);
}

/**
 * 応募すると、案件の会話（kind='job'）が無ければ新規に作り、応募メッセージを最初の
 * メッセージとして投稿し、job_applications をその会話に紐づける。既存の会話が
 * あれば再利用し、やり取り枠は消費しない（CLAUDE.md「絶対に守ること」5・確定した設計判断）。
 */
export async function applyToJobAction(jobId: string, amount: number | undefined, message: string): Promise<Result<{ conversationId: string }>> {
  const actor = await requireActor();
  if (!can(actor.role, "job.apply")) return err("PERMISSION_DENIED");
  if (!message.trim()) return err("EMPTY_MESSAGE");

  const supabase = await createClient();
  const job = await loadJob(supabase, jobId);
  if (!job) return err("JOB_NOT_FOUND");
  if (!canApply(job, actor.companyId)) return err("CANNOT_APPLY");

  const existingApplication = await loadMyApplication(supabase, jobId, actor.companyId);
  if (existingApplication) return err("ALREADY_APPLIED");

  let conversationId: string;
  const existingConv = await findExistingConversation(supabase, "job", actor.companyId, job.companyId, jobId);
  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const plan = await getCompanyPlan(supabase, actor.companyId);
    const started = await conversationsStartedThisMonth(supabase, actor.companyId);
    const quota = checkQuota(plan, { ...emptyUsage(), conversationsStartedThisMonth: started }, "conversation.start");
    if (!quota.ok) return err(quota.reason);

    const { data: convRow, error: convError } = await supabase
      .from("conversations")
      .insert({ kind: "job", job_id: jobId, company_a: actor.companyId, company_b: job.companyId })
      .select("id")
      .single();
    if (convError) return err(convError.message);
    conversationId = convRow.id;
  }

  const msgResult = await insertMessage(supabase, conversationId, actor.companyId, actor.userId, message);
  if (!msgResult.ok) return err(msgResult.error);

  const { error: appError } = await insertApplication(supabase, jobId, actor.companyId, amount, message, conversationId);
  if (appError) return err(appError.message);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/messages");
  return ok({ conversationId });
}

export async function postAvailabilityAction(input: {
  kind: "ninku" | "waku";
  industry: string;
  area: string;
  fromDate: string;
  toDate: string;
  headcount?: number;
  tanka?: number;
  note?: string;
}): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "availability.manage")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const plan = await getCompanyPlan(supabase, actor.companyId);
  const openCount = await openAvailabilityCount(supabase, actor.companyId);
  const quota = checkQuota(plan, { ...emptyUsage(), openAvailabilityCount: openCount }, "availability.slot");
  if (!quota.ok) return err(quota.reason);

  const { error } = await insertAvailability(supabase, actor.companyId, input);
  if (error) return err(error.message);

  revalidatePath("/availabilities");
  return ok(null);
}

export async function withdrawAvailabilityAction(id: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "availability.manage")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const { data: av } = await supabase.from("availabilities").select("company_id").eq("id", id).maybeSingle();
  if (!av) return err("AVAILABILITY_NOT_FOUND");
  if (av.company_id !== actor.companyId) return err("NOT_OWN_AVAILABILITY");

  const { error } = await withdrawAvailability(supabase, id);
  if (error) return err(error.message);

  revalidatePath("/availabilities");
  return ok(null);
}
