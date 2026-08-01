"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { Role, countsTowardUserLimit, BASIC_INVITE_ROLES, ADVANCED_INVITE_ROLES } from "@/domain/auth/Role";
import { checkQuota } from "@/domain/plan/Quota";
import { emptyUsage } from "@/domain/plan/Usage";
import { getCompanyPlan } from "@/lib/supabase/plan";

const INVITABLE_ROLES: Role[] = [...BASIC_INVITE_ROLES, ...ADVANCED_INVITE_ROLES];

/**
 * ユーザー招待。owner のみ（04_権限ロール設計.md 2-4「ユーザーを招待・削除する」）。
 * 実際の users 行の作成は、招待メールを受けた相手がパスワードを設定した瞬間に
 * DBトリガ（supabase/migrations/0007_invites.sql）が作る。ここでは auth ユーザーの
 * 作成とメタデータの付与だけを行う。
 */
export async function inviteMemberAction(email: string, name: string, role: Role): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "user.invite")) return err("PERMISSION_DENIED");
  if (!INVITABLE_ROLES.includes(role)) return err("INVALID_ROLE");

  const supabase = await createClient();

  if (countsTowardUserLimit(role)) {
    const plan = await getCompanyPlan(supabase, actor.companyId);
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("company_id", actor.companyId)
      .in("role", ["owner", "admin", "accounting"]);
    const quota = checkQuota(plan, { ...emptyUsage(), paidUserCount: count ?? 0 }, "user.invite");
    if (!quota.ok) return err(quota.reason);
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      invited_company_id: actor.companyId,
      invited_role: role,
      invited_name: name,
    },
  });
  if (error) return err(error.message);

  return ok(null);
}
