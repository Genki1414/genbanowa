// 開発用：メール確認を経由せず、シードの既存の会社に紐づいたテストアカウントを1コマンドで作る。
// サインアップ→メール確認→link_test_account.sql という3ステップを、
// メールのレート制限にかからない形で1回にまとめたもの。検証専用。本番では使わないこと。
//
// 使い方：
//   node scripts/dev-create-test-account.mjs <email> <password> <氏名> <会社名> <ロール>
// 例：
//   node scripts/dev-create-test-account.mjs test-c@example.com test12345678 "村上 直人" 丸和塗装 owner

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const [, , email, password, name, companyName, role] = process.argv;
if (!email || !password || !name || !companyName || !role) {
  console.error(
    "使い方: node scripts/dev-create-test-account.mjs <email> <password> <氏名> <会社名> <ロール>",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が読み込めませんでした。" +
      ".env.local がプロジェクト直下にあるか確認してください。",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: company, error: companyError } = await admin
  .from("companies")
  .select("id, name")
  .eq("name", companyName)
  .maybeSingle();
if (companyError) {
  console.error("会社の検索に失敗しました:", companyError.message);
  process.exit(1);
}
if (!company) {
  console.error(`会社「${companyName}」が見つかりませんでした。シードデータが投入されているか確認してください。`);
  process.exit(1);
}

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError) {
  console.error("ユーザー作成に失敗しました:", createError.message);
  process.exit(1);
}

const { error: insertError } = await admin
  .from("users")
  .insert({ id: created.user.id, company_id: company.id, name, role });
if (insertError) {
  console.error("public.usersへの登録に失敗しました:", insertError.message);
  process.exit(1);
}

console.log(`OK: ${email} を ${companyName}（${role}）として作成しました。/login からログインしてください。`);
