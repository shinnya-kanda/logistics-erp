/**
 * 本番運用向けの取込ログ（console）。将来 logger に差し替えやすいよう集約。
 */
const PREFIX = "[logistics-erp/importer]";

export type ImportLogContext = Record<string, string | number | boolean | undefined | null>;

function formatCtx(ctx?: ImportLogContext): string {
  if (!ctx || Object.keys(ctx).length === 0) return "";
  return (
    " | " +
    Object.entries(ctx)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")
  );
}

export function importLogInfo(message: string, ctx?: ImportLogContext): void {
  console.info(`${PREFIX} ${message}${formatCtx(ctx)}`);
}

export function importLogWarn(message: string, ctx?: ImportLogContext): void {
  console.warn(`${PREFIX} ${message}${formatCtx(ctx)}`);
}

export function importLogError(message: string, ctx?: ImportLogContext): void {
  console.error(`${PREFIX} ${message}${formatCtx(ctx)}`);
}
