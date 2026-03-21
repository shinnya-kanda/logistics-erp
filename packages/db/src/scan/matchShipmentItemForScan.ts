import type { ScanInputPayload } from "@logistics-erp/schema";
import type { ShipmentItemMatchResult } from "@logistics-erp/schema";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/**
 * スキャン入力から shipment_item を解決する最小ルール。
 *
 * 1. trace_id があれば trace_id で検索（shipment_items.trace_id は UNIQUE）
 * 2. なければ scanned_part_no または scanned_code をトークンに、
 *    part_no / external_barcode / match_key（trim + 大文字比較）で一致
 * 3. scope_shipment_id があれば shipment_id で限定（推奨）
 *
 * 複数候補: kind=ambiguous（件数を返し、勝手に 1 件選ばない）
 * 0 件: kind=none
 */
export async function matchShipmentItemForScan(
  sql: Sql,
  input: ScanInputPayload
): Promise<ShipmentItemMatchResult> {
  const scope = input.scope_shipment_id?.trim() || null;

  const trace = input.trace_id?.trim();
  if (trace) {
    const rows = scope
      ? await sql<{ id: string }[]>`
          SELECT id FROM public.shipment_items
          WHERE trace_id = ${trace} AND shipment_id = ${scope}::uuid
          LIMIT 2
        `
      : await sql<{ id: string }[]>`
          SELECT id FROM public.shipment_items
          WHERE trace_id = ${trace}
          LIMIT 2
        `;
    if (rows.length === 1) return { kind: "unique", shipment_item_id: rows[0].id };
    if (rows.length === 0) {
      /* trace 失敗時はフォールバックへ */
    } else {
      return { kind: "ambiguous", candidate_ids: rows.map((r) => r.id) };
    }
  }

  const token = (input.scanned_part_no ?? input.scanned_code).trim();
  if (!token) {
    return { kind: "none" };
  }

  const rows = scope
    ? await sql<{ id: string }[]>`
        SELECT id FROM public.shipment_items
        WHERE shipment_id = ${scope}::uuid
          AND (
            upper(trim(part_no)) = upper(trim(${token}))
            OR (external_barcode IS NOT NULL AND upper(trim(external_barcode)) = upper(trim(${token})))
            OR (match_key IS NOT NULL AND upper(trim(match_key)) = upper(trim(${token})))
          )
        LIMIT 10
      `
    : await sql<{ id: string }[]>`
        SELECT id FROM public.shipment_items
        WHERE (
            upper(trim(part_no)) = upper(trim(${token}))
            OR (external_barcode IS NOT NULL AND upper(trim(external_barcode)) = upper(trim(${token})))
            OR (match_key IS NOT NULL AND upper(trim(match_key)) = upper(trim(${token})))
          )
        LIMIT 10
      `;

  if (rows.length === 0) return { kind: "none" };
  if (rows.length === 1) return { kind: "unique", shipment_item_id: rows[0].id };
  return { kind: "ambiguous", candidate_ids: rows.map((r) => r.id) };
}
