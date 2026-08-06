import { createClient } from "@/lib/supabase/server";
import { Role } from "@/domain/auth/Role";

export interface CurrentActor {
  userId: string;
  companyId: string;
  role: Role;
  name: string;
  isStaff: boolean;
}

/**
 * ログイン中のユーザーと、その所属会社・ロールをまとめて取得する。
 * 認証はされていても会社未登録（bootstrap_company未実行）の場合は null を返す
 * — 呼び出し側は /signup/company に誘導すること。
 */
export async function currentActor(): Promise<CurrentActor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, company_id, role, name, is_staff")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;

  return { userId: data.id, companyId: data.company_id, role: data.role as Role, name: data.name, isStaff: data.is_staff };
}

export async function requireActor(): Promise<CurrentActor> {
  const actor = await currentActor();
  if (!actor) throw new Error("UNAUTHENTICATED");
  return actor;
}
