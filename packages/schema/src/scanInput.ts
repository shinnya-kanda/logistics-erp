/**
 * Phase2: スキャン入力コントラクト（PWA / API / service 共通）
 * 検証は validateScanInput で一箇所に集約する。
 */

export type ScanInputPayload = {
  scanned_code: string
  scan_type: string
  scanned_at?: string | null
  operator_id?: string | null
  operator_name?: string | null
  device_id?: string | null
  quantity_scanned?: number | null
  quantity_unit?: string | null
  unload_location_scanned?: string | null
  trace_id?: string | null
  scanned_part_no?: string | null
  raw_payload?: Record<string, unknown> | null
  /**
   * 同一出荷ヘッダ内にマッチを限定する（推奨）。
   * 未指定時は DB 全体から照合（運用上のリスクあり）。
   */
  scope_shipment_id?: string | null
}

export class ScanInputValidationError extends Error {
  constructor(message: string) {
    super(`[scanInput] ${message}`);
    this.name = "ScanInputValidationError";
  }
}

/**
 * スキャン入力の検証。通過後のみ DB 書き込みに進む。
 */
export function validateScanInput(raw: unknown): ScanInputPayload {
  if (raw === null || typeof raw !== "object") {
    throw new ScanInputValidationError("body がオブジェクトではありません。");
  }
  const o = raw as Record<string, unknown>;

  const scanned_code = String(o.scanned_code ?? "").trim();
  if (!scanned_code) {
    throw new ScanInputValidationError(
      "scanned_code は必須です（空・空白のみは不可）。"
    );
  }

  const scan_type = String(o.scan_type ?? "").trim();
  if (!scan_type) {
    throw new ScanInputValidationError("scan_type は必須です。");
  }

  const quantity_scanned =
    o.quantity_scanned === undefined || o.quantity_scanned === null
      ? null
      : Number(o.quantity_scanned);
  if (quantity_scanned !== null) {
    if (Number.isNaN(quantity_scanned) || !Number.isFinite(quantity_scanned)) {
      throw new ScanInputValidationError("quantity_scanned が数値として不正です。");
    }
    if (quantity_scanned < 1) {
      throw new ScanInputValidationError(
        "quantity_scanned は指定する場合 1 以上の整数である必要があります。"
      );
    }
    if (!Number.isInteger(quantity_scanned)) {
      throw new ScanInputValidationError(
        "quantity_scanned は整数である必要があります。"
      );
    }
  }

  const scanned_at =
    o.scanned_at === undefined || o.scanned_at === null
      ? null
      : String(o.scanned_at).trim() || null;

  const scope_shipment_id =
    o.scope_shipment_id === undefined || o.scope_shipment_id === null
      ? null
      : String(o.scope_shipment_id).trim() || null;

  return {
    scanned_code,
    scan_type,
    scanned_at,
    operator_id: optString(o.operator_id),
    operator_name: optString(o.operator_name),
    device_id: optString(o.device_id),
    quantity_scanned,
    quantity_unit: optString(o.quantity_unit),
    unload_location_scanned: optString(o.unload_location_scanned),
    trace_id: optString(o.trace_id),
    scanned_part_no: optString(o.scanned_part_no),
    raw_payload:
      o.raw_payload !== undefined && o.raw_payload !== null
        ? (o.raw_payload as Record<string, unknown>)
        : null,
    scope_shipment_id,
  };
}

function optString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}
