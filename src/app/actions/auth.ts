"use server";

import { createClient } from "@/lib/supabase/server";
import { Result, ok, err } from "@/domain/shared/result";

export async function signInAction(email: string, password: string): Promise<Result<null>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return err(error.message);
  return ok(null);
}

/**
 * サインアップ。メール確認が有効なSupabaseプロジェクト設定では session が返らないため、
 * その場合は呼び出し側で「確認メールを送りました」と案内する。
 */
export async function signUpAction(email: string, password: string): Promise<Result<{ needsEmailConfirm: boolean }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return err(error.message);
  return ok({ needsEmailConfirm: data.session === null });
}

export async function bootstrapCompanyAction(
  name: string,
  type: "corp" | "sole",
  userName: string,
): Promise<Result<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("bootstrap_company", {
    p_name: name,
    p_type: type,
    p_user_name: userName,
  });
  if (error) return err(error.message);
  return ok(null);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
