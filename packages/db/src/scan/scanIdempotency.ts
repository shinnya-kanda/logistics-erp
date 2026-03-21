import postgres from "postgres";
import type { ScanEventRow } from "@logistics-erp/schema";
import type { ShipmentItemMatchResult } from "@logistics-erp/schema";
import type { ShipmentItemProgressRow } from "@logistics-erp/schema";
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

/** raw_payload からマッチ種別を復元（replay 応答用） */
export function matchResultFromScanEventRow(
  row: ScanEventRow
): ShipmentItemMatchResult {
  const p = row.raw_payload;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    const o = p as Record<string, unknown>;
    const kind = String(o.match_kind ?? "");
    if (kind === "ambiguous" && Array.isArray(o.candidate_ids)) {
      return {
        kind: "ambiguous",
        candidate_ids: (o.candidate_ids as unknown[]).map(String),
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
  };
}
