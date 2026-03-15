import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl.trim()) {
  throw new Error(
    "[apps/api] SUPABASE_URL が設定されていません。環境変数 SUPABASE_URL を設定してください。"
  );
}
if (!supabaseAnonKey.trim()) {
  throw new Error(
    "[apps/api] SUPABASE_ANON_KEY が設定されていません。環境変数 SUPABASE_ANON_KEY を設定してください。"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
