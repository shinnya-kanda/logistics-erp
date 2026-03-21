import type { ScanInputPayload } from "@logistics-erp/schema";
import type {
  AmbiguousScanCandidate,
  AmbiguousScanCandidateMatchBasis,
  ShipmentItemMatchResult,
} from "@logistics-erp/schema";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

type CandidateRow = {
  id: string;
  shipment_id: string;
  part_no: string;
  part_name: string | null;
  quantity_expected: string;
  quantity_unit: string | null;
  unload_location: string | null;
  trace_id: string;
  delivery_date: string | null;
  match_basis: string;
};

function rowToCandidate(r: CandidateRow): AmbiguousScanCandidate {
  const mb = r.match_basis;
  const basis: AmbiguousScanCandidateMatchBasis =
    mb === "trace_id" ||
    mb === "part_no" ||
    mb === "external_barcode" ||
    mb === "match_key"
      ? mb
      : "unknown";
  return {
    shipment_item_id: r.id,
    shipment_id: r.shipment_id,
    part_no: r.part_no,
    part_name: r.part_name,
    quantity_expected: String(r.quantity_expected),
    quantity_unit: r.quantity_unit,
    unload_location: r.unload_location,
    trace_id: r.trace_id?.trim() ? r.trace_id : null,
    delivery_date: r.delivery_date,
    match_basis: basis,
  };
}

function ambiguousFromRows(rows: CandidateRow[]): ShipmentItemMatchResult {
  const candidates = rows.map(rowToCandidate);
  return {
    kind: "ambiguous",
    candidate_ids: candidates.map((c) => c.shipment_item_id),
    candidates,
  };
}

/**
 * スキャン入力から shipment_item を解決する最小ルール。
 *
 * 1. trace_id があれば trace_id で検索（shipment_items.trace_id は UNIQUE）
 * 2. なければ scanned_part_no または scanned_code をトークンに、
 *    part_no / external_barcode / match_key（trim + 大文字比較）で一致
 * 3. scope_shipment_id があれば shipment_id で限定（推奨）
 *
 * 複数候補: kind=ambiguous（候補詳細を返し、勝手に 1 件選ばない）
 * 0 件: kind=none
 */
export async function matchShipmentItemForScan(
  sql: Sql,
  input: ScanInputPayload
): Promise<ShipmentItemMatchResult> {
  const scope = input.scope_shipment_id?.trim() || null;

  const trace = input.trace_id?.trim();
  if (trace) {
    const traceRows = scope
      ? await sql<CandidateRow[]>`
          SELECT
            si.id,
            si.shipment_id,
            si.part_no,
            si.part_name,
            si.quantity_expected::text AS quantity_expected,
            si.quantity_unit,
            si.unload_location,
            si.trace_id,
            si.delivery_date,
            'trace_id' AS match_basis
          FROM public.shipment_items si
          WHERE si.trace_id = ${trace}
            AND si.shipment_id = ${scope}::uuid
          LIMIT 10
        `
      : await sql<CandidateRow[]>`
          SELECT
            si.id,
            si.shipment_id,
            si.part_no,
            si.part_name,
            si.quantity_expected::text AS quantity_expected,
            si.quantity_unit,
            si.unload_location,
            si.trace_id,
            si.delivery_date,
            'trace_id' AS match_basis
          FROM public.shipment_items si
          WHERE si.trace_id = ${trace}
          LIMIT 10
        `;
    if (traceRows.length === 1) {
      return { kind: "unique", shipment_item_id: traceRows[0].id };
    }
    if (traceRows.length > 1) {
      return ambiguousFromRows(traceRows);
    }
    /* 0 件 → フォールバックへ */
  }

  const token = (input.scanned_part_no ?? input.scanned_code).trim();
  if (!token) {
    return { kind: "none" };
  }

  const tokenRows = scope
    ? await sql<CandidateRow[]>`
        SELECT
          si.id,
          si.shipment_id,
          si.part_no,
          si.part_name,
          si.quantity_expected::text AS quantity_expected,
          si.quantity_unit,
          si.unload_location,
          si.trace_id,
          si.delivery_date,
          CASE
            WHEN upper(trim(si.part_no)) = upper(trim(${token})) THEN 'part_no'
            WHEN si.external_barcode IS NOT NULL
              AND upper(trim(si.external_barcode)) = upper(trim(${token})) THEN 'external_barcode'
            WHEN si.match_key IS NOT NULL
              AND upper(trim(si.match_key)) = upper(trim(${token})) THEN 'match_key'
            ELSE 'unknown'
          END AS match_basis
        FROM public.shipment_items si
        WHERE si.shipment_id = ${scope}::uuid
          AND (
            upper(trim(si.part_no)) = upper(trim(${token}))
            OR (
              si.external_barcode IS NOT NULL
              AND upper(trim(si.external_barcode)) = upper(trim(${token}))
            )
            OR (
              si.match_key IS NOT NULL
              AND upper(trim(si.match_key)) = upper(trim(${token}))
            )
          )
        LIMIT 10
      `
    : await sql<CandidateRow[]>`
        SELECT
          si.id,
          si.shipment_id,
          si.part_no,
          si.part_name,
          si.quantity_expected::text AS quantity_expected,
          si.quantity_unit,
          si.unload_location,
          si.trace_id,
          si.delivery_date,
          CASE
            WHEN upper(trim(si.part_no)) = upper(trim(${token})) THEN 'part_no'
            WHEN si.external_barcode IS NOT NULL
              AND upper(trim(si.external_barcode)) = upper(trim(${token})) THEN 'external_barcode'
            WHEN si.match_key IS NOT NULL
              AND upper(trim(si.match_key)) = upper(trim(${token})) THEN 'match_key'
            ELSE 'unknown'
          END AS match_basis
        FROM public.shipment_items si
        WHERE (
            upper(trim(si.part_no)) = upper(trim(${token}))
            OR (
              si.external_barcode IS NOT NULL
              AND upper(trim(si.external_barcode)) = upper(trim(${token}))
            )
            OR (
              si.match_key IS NOT NULL
              AND upper(trim(si.match_key)) = upper(trim(${token}))
            )
          )
        LIMIT 10
      `;

  if (tokenRows.length === 0) return { kind: "none" };
  if (tokenRows.length === 1) {
    return { kind: "unique", shipment_item_id: tokenRows[0].id };
  }
  return ambiguousFromRows(tokenRows);
}
