// 開発用：検証中に会社を素早く切り替えられるよう、シードの各会社に
// 「同じパスワードでログインできるテストアカウント」を一括で用意する。
// 既にユーザーがいる会社は、そのユーザーのパスワードを共通パスワードに揃えるだけ。
// いない会社は owner を1人新規作成する。最後に会社名とログイン用メールの一覧を表示する。
// 検証専用。本番では使わないこと。
//
// 使い方：
//   node scripts/dev-provision-test-logins.mjs <共通パスワード（8文字以上）>

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const [, , password] = process.argv;
if (!password || password.length < 8) {
  console.error("使い方: node scripts/dev-provision-test-logins.mjs <共通パスワード（8文字以上）>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が読み込めませんでした。");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: companies, error: companiesError } = await admin.from("companies").select("id, name").order("name");
if (companiesError) {
  console.error("会社一覧の取得に失敗しました:", companiesError.message);
  process.exit(1);
}

const rows = [];

for (let i = 0; i < companies.length; i++) {
  const company = companies[i];
  const { data: existingUsers, error: usersError } = await admin
    .from("users")
    .select("id, name, role")
    .eq("company_id", company.id)
    .order("created_at", { ascending: true })
    .limit(1);
  if (usersError) {
    console.error(`${company.name}: users取得に失敗しました: ${usersError.message}`);
    continue;
  }

  if (existingUsers && existingUsers.length > 0) {
    const target = existingUsers[0];
    const { data: authUser, error: getUserError } = await admin.auth.admin.getUserById(target.id);
    if (getUserError || !authUser?.user?.email) {
      console.error(`${company.name}: authユーザーの取得に失敗しました。`);
      continue;
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(target.id, { password });
    if (updateError) {
      console.error(`${company.name}: パスワード更新に失敗しました: ${updateError.message}`);
      continue;
    }
    rows.push({ company: company.name, email: authUser.user.email, role: target.role, note: "既存を更新" });
  } else {
    const email = `dev-test-${i + 1}@example.test`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      console.error(`${company.name}: ユーザー作成に失敗しました: ${createError.message}`);
      continue;
    }
    const { error: insertError } = await admin
      .from("users")
      .insert({ id: created.user.id, company_id: company.id, name: "テストユーザー", role: "owner" });
    if (insertError) {
      console.error(`${company.name}: public.usersへの登録に失敗しました: ${insertError.message}`);
      continue;
    }
    rows.push({ company: company.name, email, role: "owner", note: "新規作成" });
  }
}

console.log("");
console.log(`共通パスワード: ${password}`);
console.log("");
console.table(rows);
