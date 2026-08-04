import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/database.types";

/** 01_実装設計書.md 5章：署名URLの有効期限は10分。 */
const SIGNED_URL_TTL_SECONDS = 600;

export const SITE_PHOTOS_BUCKET = "site-photos";

export function sitePhotoPath(siteId: string, photoId: string): string {
  return `${siteId}/${photoId}.jpg`;
}

/** 複数の写真パスをまとめて署名URLに変換する。取得できなかったものは省く。 */
export async function signSitePhotoUrls(
  supabase: SupabaseClient<Database>,
  filePaths: string[],
): Promise<Map<string, string>> {
  if (filePaths.length === 0) return new Map();
  const { data } = await supabase.storage.from(SITE_PHOTOS_BUCKET).createSignedUrls(filePaths, SIGNED_URL_TTL_SECONDS);
  const map = new Map<string, string>();
  for (const d of data ?? []) {
    if (d.signedUrl && d.path) map.set(d.path, d.signedUrl);
  }
  return map;
}
