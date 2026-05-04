/**
 * Scan minimal HTTP（scanHttp.ts）のベース URL。
 * 例: http://localhost:3040（末尾スラッシュなし）
 */
export function getScanApiBaseUrl(): string {
  const raw = import.meta.env.VITE_SCAN_API_BASE_URL as string | undefined;
  const base = (raw?.trim() || "http://localhost:3040").replace(/\/$/, "");
  return base;
}

/**
 * Supabase Edge Functions のベース URL。
 * 例: https://your-project.supabase.co/functions/v1（末尾スラッシュなし）
 */
export function getSupabaseFunctionsBaseUrl(): string {
  const raw = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  const base = (raw?.trim() || "http://localhost:54321/functions/v1").replace(/\/$/, "");
  return base;
}
