import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "./database.types";

/**
 * セッションクッキーの更新。Server Components は cookie を書けないため、
 * トークンのリフレッシュは middleware でだけ行う（@supabase/ssr の標準構成）。
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() を呼ぶことでトークンが必要なら更新される。ここで取得したユーザーは
  // 各ページ側で使わず、あくまでリフレッシュのトリガーとして使う。
  await supabase.auth.getUser();

  return response;
}
