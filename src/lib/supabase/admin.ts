import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

/**
 * service-role クライアント。RLSを完全にバイパスする。
 * Server Action（"use server"ファイル）からしか呼ばないこと。
 * クライアントコンポーネントに渡したり、SUPABASE_SERVICE_ROLE_KEY を
 * NEXT_PUBLIC_ を付けて公開しないこと。
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
