"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";

/**
 * 現場担当の割り当て。field ロールは site_assignments にある取引だけが見える
 * （04_権限ロール設計.md 3章）。割り当ては owner / admin / accounting が、
 * 自社に属するユーザーに対してのみ行える。
 */
export async function assignFieldUserAction(txId: string, userId: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "assignment.manage")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const { data: user } = await supabase.from("users").select("id, company_id").eq("id", userId).maybeSingle();
  if (!user || user.company_id !== actor.companyId) return err("USER_NOT_IN_COMPANY");

  const { error } = await supabase.from("site_assignments").insert({ transaction_id: txId, user_id: userId });
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}

export async function unassignFieldUserAction(txId: string, userId: string): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "assignment.manage")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_assignments")
    .delete()
    .eq("transaction_id", txId)
    .eq("user_id", userId);
  if (error) return err(error.message);

  revalidatePath(`/transactions/${txId}`);
  return ok(null);
}
