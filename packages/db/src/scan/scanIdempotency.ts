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

export function isIdempotencyUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; constraint_name?: string; message?: string };
  if (e.code !== "23505") return false;
  const c = (e.constraint_name ?? "").toLowerCase();
  const m = (e.message ?? "").toLowerCase();
  return (
    c.includes("idempotency") ||
    c.includes("uq_scan_events_idempotency") ||
    m.includes("uq_scan_events_idempotency")
  );
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
