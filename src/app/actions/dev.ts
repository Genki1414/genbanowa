"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 検証中に会社を素早く切り替えるための開発専用アクション。
 * 本番ビルド（NODE_ENV=production）では常に空配列を返し、一覧すら取得できないようにする。
 * UI側の出し分けだけに頼らない（CLAUDE.md「絶対に守ること」1と同じ考え方：
 * クライアント側の非表示だけでは守れないので、サーバー側で必ず落とす）。
 */
export interface DevAccount {
  companyName: string;
  email: string;
  role: string;
}

export async function listDevAccountsAction(): Promise<DevAccount[]> {
  if (process.env.NODE_ENV === "production") return [];

  const admin = createAdminClient();
  const { data: companies } = await admin.from("companies").select("id, name").order("name");
  if (!companies) return [];

  const results: DevAccount[] = [];
  for (const company of companies) {
    const { data: users } = await admin
      .from("users")
      .select("id, role")
      .eq("company_id", company.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const user = users?.[0];
    if (!user) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(user.id);
    if (!authUser?.user?.email) continue;

    results.push({ companyName: company.name, email: authUser.user.email, role: user.role });
  }
  return results;
}
