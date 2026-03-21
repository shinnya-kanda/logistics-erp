import postgres from "postgres";
import { requireDatabaseUrl } from "./expectedImportRepository.js";

/**
 * shipment_items ごとに progress 行が無ければ作成する（冪等）。
 * Phase1 取込直後および checksum 冪等ヒット後に呼び出し、既存行は変更しない。
 */
export async function ensureShipmentItemProgressForShipmentId(
  shipmentId: string
): Promise<void> {
  if (!shipmentId?.trim()) return;

  const sql = postgres(requireDatabaseUrl(), { max: 1 });
  try {
    await sql`
      INSERT INTO public.shipment_item_progress (
        shipment_item_id,
        trace_id,
        quantity_expected,
        quantity_scanned_total,
        progress_status
      )
      SELECT
        si.id,
        si.trace_id,
        si.quantity_expected,
        0,
        'planned'
      FROM public.shipment_items si
      WHERE si.shipment_id = ${shipmentId.trim()}::uuid
      ON CONFLICT (shipment_item_id) DO NOTHING
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
