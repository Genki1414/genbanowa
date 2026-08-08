"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor } from "@/lib/auth";
import { decideDispute, approveTrustDocument, rejectTrustDocument } from "@/lib/supabase/adminRepo";
import { Result, ok, err } from "@/domain/shared/result";

/**
 * 遅延の確定判断。運営（users.is_staff）のみ。会社ロール（can()）とは別軸の権限なので、
 * ここだけは can() を経由せず actor.isStaff を直接見る。
 * record_payment_delay() は 'under_review' からしか遷移させない（DB側の防御と二重）。
 */
export async function decideDisputeAction(
  disputeId: string,
  decision: "recorded" | "resolved",
  note: string | undefined,
): Promise<Result<null>> {
  const actor = await requireActor();
  if (!actor.isStaff) return err("PERMISSION_DENIED");

  const admin = createAdminClient();
  const { error } = await decideDispute(admin, disputeId, decision, note, actor.userId);
  if (error) return err(error.message);

  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
  return ok(null);
}

/** 信用書類の承認・却下。運営（users.is_staff）のみ。company.edit等のcan()とは別軸の権限。 */
export async function approveTrustDocumentAction(docId: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!actor.isStaff) return err("PERMISSION_DENIED");

  const admin = createAdminClient();
  const { error } = await approveTrustDocument(admin, docId, actor.userId);
  if (error) return err(error.message);

  revalidatePath("/admin/trust-documents");
  revalidatePath(`/admin/trust-documents/${docId}`);
  return ok(null);
}

export async function rejectTrustDocumentAction(docId: string, note: string | undefined): Promise<Result<null>> {
  const actor = await requireActor();
  if (!actor.isStaff) return err("PERMISSION_DENIED");

  const admin = createAdminClient();
  const { error } = await rejectTrustDocument(admin, docId, actor.userId, note);
  if (error) return err(error.message);

  revalidatePath("/admin/trust-documents");
  revalidatePath(`/admin/trust-documents/${docId}`);
  return ok(null);
}
