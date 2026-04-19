import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * ブラウザ用 Supabase クライアント（シングルトン）。
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が無い場合は null。
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client) return client;

  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!url || !anon) {
    return null;
  }

  client = createClient(url, anon);
  return client;
}
