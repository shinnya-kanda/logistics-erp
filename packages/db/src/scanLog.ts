/**
 * Phase2 scan フロー用ログ（importer の importLog と同様のプレフィックス規約）
 */
const PREFIX = "[logistics-erp/scan]";

export type ScanLogContext = Record<
  string,
  string | number | boolean | undefined | null
>;

function formatCtx(ctx?: ScanLogContext): string {
  if (!ctx || Object.keys(ctx).length === 0) return "";
  return (
    " | " +
    Object.entries(ctx)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")
  );
}

export function scanLogInfo(message: string, ctx?: ScanLogContext): void {
  console.info(`${PREFIX} ${message}${formatCtx(ctx)}`);
}

export function scanLogWarn(message: string, ctx?: ScanLogContext): void {
  console.warn(`${PREFIX} ${message}${formatCtx(ctx)}`);
}

export function scanLogError(message: string, ctx?: ScanLogContext): void {
  console.error(`${PREFIX} ${message}${formatCtx(ctx)}`);
}
