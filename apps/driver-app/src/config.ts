/**
 * Scan minimal HTTP（scanHttp.ts）のベース URL。
 * 例: http://localhost:3040（末尾スラッシュなし）
 */
export function getScanApiBaseUrl(): string {
  const raw = import.meta.env.VITE_SCAN_API_BASE_URL as string | undefined;
  const base = (raw?.trim() || "http://localhost:3040").replace(/\/$/, "");
  return base;
}
