import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL?.trim()) {
  throw new Error(
    "[@logistics-erp/db] SUPABASE_URL が設定されていません。環境変数 SUPABASE_URL を設定してください。"
  );
}
if (!SUPABASE_ANON_KEY?.trim()) {
  throw new Error(
    "[@logistics-erp/db] SUPABASE_ANON_KEY が設定されていません。環境変数 SUPABASE_ANON_KEY を設定してください。"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
