// 開発用：Supabase Authのメール送信を経由せず、service role keyで直接パスワードを設定する。
// メールのレート制限にかかった時の検証用ログイン手段。本番では使わないこと。
//
// 使い方：
//   node scripts/dev-set-password.mjs <email> <新しいパスワード>

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

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("使い方: node scripts/dev-set-password.mjs <email> <新しいパスワード（8文字以上）>");
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

let user = null;
let page = 1;
for (;;) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("ユーザー一覧の取得に失敗しました:", error.message);
    process.exit(1);
  }
  user = data.users.find((u) => u.email === email);
  if (user || data.users.length < 200) break;
  page += 1;
}

if (!user) {
  console.error(`メールアドレス ${email} のユーザーが見つかりませんでした。`);
  process.exit(1);
}

const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password });
if (updateError) {
  console.error("パスワードの更新に失敗しました:", updateError.message);
  process.exit(1);
}

console.log(`OK: ${email} のパスワードを設定しました。/login からログインしてください。`);
