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
  /**
   * Phase2.1: クライアント生成の冪等キー（再送・二重 POST 時に同一結果を返す）。
   * 未指定のリクエストは非冪等（従来どおり毎回新規 scan 行）。
   */
  idempotency_key?: string | null
  /**
   * Phase2.3: ambiguous 解消でユーザーが選んだ明細。指定時は自動マッチより優先して照合する。
   * 初回 ambiguous 送信とは別の idempotency_key で送ること。
   */
  selected_shipment_item_id?: string | null
}

const IDEMPOTENCY_KEY_MAX_LEN = 512;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let idempotency_key: string | null = null;
  if (o.idempotency_key !== undefined && o.idempotency_key !== null) {
    const k = String(o.idempotency_key).trim();
    if (!k) {
      throw new ScanInputValidationError(
        "idempotency_key に空文字・空白のみは指定できません。省略するか非空の文字列を指定してください。"
      );
    }
    if (k.length > IDEMPOTENCY_KEY_MAX_LEN) {
      throw new ScanInputValidationError(
        `idempotency_key は最大 ${IDEMPOTENCY_KEY_MAX_LEN} 文字です。`
      );
    }
    idempotency_key = k;
  }

  let selected_shipment_item_id: string | null = null;
  if (
    o.selected_shipment_item_id !== undefined &&
    o.selected_shipment_item_id !== null
  ) {
    const sid = String(o.selected_shipment_item_id).trim();
    if (!sid) {
      throw new ScanInputValidationError(
        "selected_shipment_item_id に空文字・空白のみは指定できません。"
      );
    }
    if (!UUID_RE.test(sid)) {
      throw new ScanInputValidationError(
        "selected_shipment_item_id は有効な UUID である必要があります。"
      );
    }
    selected_shipment_item_id = sid.toLowerCase();
  }

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
    idempotency_key,
    selected_shipment_item_id,
  };
}

function optString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}
