import { loadEnv } from "@logistics-erp/db/load-env";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "SUPABASE_URL と SUPABASE_ANON_KEY が未設定です。リポジトリ直下の .env に設定するか、services/api/.env にコピーしてください。"
  );
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySupabaseConnection(): Promise<void> {
  const base = supabaseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/auth/v1/health`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!res.ok) {
    console.error(
      `Supabase への接続に失敗しました: HTTP ${res.status} ${res.statusText}（URL・anon key を確認してください）`
    );
    process.exitCode = 1;
    return;
  }

  console.log("Supabase に接続できました（Auth health）。API service ready.");
}

void verifySupabaseConnection();
