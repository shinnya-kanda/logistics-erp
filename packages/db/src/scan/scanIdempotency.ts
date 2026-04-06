import postgres from "postgres";
import type {
  AmbiguousScanCandidate,
  AmbiguousScanCandidateMatchBasis,
  ScanEventRow,
  ShipmentItemMatchResult,
  ShipmentItemProgressRow,
} from "@logistics-erp/schema";
import type { ProcessScanOutput } from "./processScanTypes.js";

type Sql = ReturnType<typeof postgres>;

/** postgres.js / ドライバが cause で包む場合があるため連鎖を辿る */
function* walkErrorChain(err: unknown): Generator<unknown> {
  const seen = new Set<unknown>();
  const stack: unknown[] = [err];
  while (stack.length) {
    const e = stack.pop();
    if (e === undefined || e === null || typeof e !== "object") continue;
    if (seen.has(e)) continue;
    seen.add(e);
    yield e;
    if (e instanceof AggregateError && Array.isArray(e.errors)) {
      for (const x of e.errors) stack.push(x);
    }
    const cause = (e as { cause?: unknown }).cause;
    if (cause !== undefined && cause !== null) stack.push(cause);
  }
}

export function isIdempotencyUniqueViolation(err: unknown): boolean {
  for (const e of walkErrorChain(err)) {
    const o = e as {
      code?: string;
      constraint_name?: string;
      message?: string;
      detail?: string;
      table_name?: string;
    };
    if (String(o.code ?? "") !== "23505") continue;
    const c = (o.constraint_name ?? "").toLowerCase();
    const m = (o.message ?? "").toLowerCase();
    const d = (o.detail ?? "").toLowerCase();
    const t = (o.table_name ?? "").toLowerCase();
    // UNIQUE INDEX 名は環境により constraint_name が空のことがある。detail の Key (idempotency_key)= で判定。
    if (
      c.includes("idempotency") ||
      c.includes("uq_scan_events_idempotency") ||
      m.includes("uq_scan_events_idempotency") ||
      m.includes("idempotency_key") ||
      d.includes("idempotency_key") ||
      (t === "scan_events" && m.includes("duplicate key"))
    ) {
      return true;
    }
  }
  return false;
}

export async function findScanEventByIdempotencyKey(
  sql: Sql,
  idempotencyKey: string
): Promise<ScanEventRow | null> {
  const rows = await sql<ScanEventRow[]>`
    SELECT *
    FROM public.scan_events
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function parseStoredAmbiguousCandidates(raw: unknown): AmbiguousScanCandidate[] {
  if (!Array.isArray(raw)) return [];
  const out: AmbiguousScanCandidate[] = [];
  for (const x of raw) {
    if (x === null || typeof x !== "object" || Array.isArray(x)) continue;
    const o = x as Record<string, unknown>;
    const shipment_item_id =
      typeof o.shipment_item_id === "string" ? o.shipment_item_id.trim() : "";
    if (!shipment_item_id) continue;
    const br =
      typeof o.match_basis === "string" ? o.match_basis : "unknown";
    const match_basis: AmbiguousScanCandidateMatchBasis =
      br === "trace_id" ||
      br === "part_no" ||
      br === "external_barcode" ||
      br === "match_key"
        ? br
        : "unknown";
    out.push({
      shipment_item_id,
      shipment_id:
        typeof o.shipment_id === "string" ? o.shipment_id : String(o.shipment_id ?? ""),
      part_no: typeof o.part_no === "string" ? o.part_no : "",
      part_name:
        o.part_name === null || o.part_name === undefined
          ? null
          : String(o.part_name),
      quantity_expected:
        typeof o.quantity_expected === "string"
          ? o.quantity_expected
          : String(o.quantity_expected ?? ""),
      quantity_unit:
        o.quantity_unit === null || o.quantity_unit === undefined
          ? null
          : String(o.quantity_unit),
      unload_location:
        o.unload_location === null || o.unload_location === undefined
          ? null
          : String(o.unload_location),
      trace_id:
        o.trace_id === null || o.trace_id === undefined
          ? null
          : String(o.trace_id),
      delivery_date:
        o.delivery_date === null || o.delivery_date === undefined
          ? null
          : String(o.delivery_date),
      match_basis,
    });
  }
  return out;
}

/** raw_payload からマッチ種別を復元（replay 応答用） */
export function matchResultFromScanEventRow(
  row: ScanEventRow
): ShipmentItemMatchResult {
  const p = row.raw_payload;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    const o = p as Record<string, unknown>;
    const kind = String(o.match_kind ?? "");
    if (kind === "ambiguous" && Array.isArray(o.candidate_ids)) {
      const candidate_ids = (o.candidate_ids as unknown[]).map(String);
      const candidates = parseStoredAmbiguousCandidates(o.ambiguous_candidates);
      return {
        kind: "ambiguous",
        candidate_ids,
        candidates,
      };
    }
    if (kind === "unique" && row.shipment_item_id) {
      return { kind: "unique", shipment_item_id: row.shipment_item_id };
    }
  }
  if (row.shipment_item_id) {
    return { kind: "unique", shipment_item_id: row.shipment_item_id };
  }
  return { kind: "none" };
}

export async function buildIdempotentReplayOutput(
  sql: Sql,
  row: ScanEventRow,
  fetchProgress: (
    s: Sql,
    shipmentItemId: string
  ) => Promise<ShipmentItemProgressRow | null>
): Promise<ProcessScanOutput> {
  const match = matchResultFromScanEventRow(row);
  let progress: ProcessScanOutput["progress"] = null;
  if (row.shipment_item_id) {
    progress = await fetchProgress(sql, row.shipment_item_id);
  }
  return {
    scanEvent: row,
    match,
    verification: null,
    progress,
    issue: null,
    idempotency_hit: true,
    created_new_scan: false,
    ambiguous_candidates:
      match.kind === "ambiguous" ? match.candidates : null,
  };
}

/**
 * INSERT 前・トランザクション失敗後の共通: 既存行があれば replay、なければ null。
 * idempotency_key 重複時は 23505 以外のラップや環境差でも catch から復旧できるようにする。
 */
export async function replayScanIfExistsByIdempotencyKey(
  sql: Sql,
  idempotencyKey: string,
  fetchProgress: (
    s: Sql,
    shipmentItemId: string
  ) => Promise<ShipmentItemProgressRow | null>
): Promise<ProcessScanOutput | null> {
  const row = await findScanEventByIdempotencyKey(sql, idempotencyKey);
  if (!row) return null;
  return buildIdempotentReplayOutput(sql, row, fetchProgress);
}
