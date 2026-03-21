/**
 * POST /scans 契約テスト用の Expected データ（固定 UUID・再実行可能な cleanup）。
 * 前提: Phase 1 / 2 / 2.1 の SQL が適用済みの Postgres。
 */
import postgres from "postgres";

/** idempotency_key のプレフィックス（cleanup 用） */
export const CONTRACT_IDEM_PREFIX = "contract-test";

export const FX = {
  sourceMain: "c2a00000-0000-4000-8000-000000000001",
  sourceAmb: "c2a00000-0000-4000-8000-000000000002",
  shipmentMain: "c2a00000-0000-4000-8000-000000000010",
  shipmentAmb: "c2a00000-0000-4000-8000-000000000011",
  /** idempotency replay 専用（他テストと進捗を共有しない） */
  itemIdem: "c2a00000-0000-4000-8000-000000000100",
  itemMatched: "c2a00000-0000-4000-8000-000000000101",
  itemWrongPart: "c2a00000-0000-4000-8000-000000000102",
  itemWrongLoc: "c2a00000-0000-4000-8000-000000000103",
  /** part_no と異なる match_key でマッチし、照合は wrong_part になる行 */
  itemMatchKey: "c2a00000-0000-4000-8000-000000000104",
  itemAmb1: "c2a00000-0000-4000-8000-000000000201",
  itemAmb2: "c2a00000-0000-4000-8000-000000000202",
} as const;

const ITEM_IDS = [
  FX.itemIdem,
  FX.itemMatched,
  FX.itemWrongPart,
  FX.itemWrongLoc,
  FX.itemMatchKey,
  FX.itemAmb1,
  FX.itemAmb2,
] as const;

export type Sql = ReturnType<typeof postgres>;

export function createFixtureSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, { max: 1 });
}

export async function cleanupScanContractFixtures(sql: Sql): Promise<void> {
  await sql`
    DELETE FROM public.scan_events
    WHERE idempotency_key LIKE ${CONTRACT_IDEM_PREFIX + "%"}
       OR shipment_item_id IN ${sql(ITEM_IDS)}
  `;
  await sql`
    DELETE FROM public.shipment_item_issues
    WHERE shipment_item_id IN ${sql(ITEM_IDS)}
  `;
  await sql`
    DELETE FROM public.shipment_item_progress
    WHERE shipment_item_id IN ${sql(ITEM_IDS)}
  `;
  await sql`
    DELETE FROM public.shipment_items
    WHERE id IN ${sql(ITEM_IDS)}
  `;
  await sql`
    DELETE FROM public.shipments
    WHERE id IN ${sql([FX.shipmentMain, FX.shipmentAmb])}
  `;
  await sql`
    DELETE FROM public.source_files
    WHERE id IN ${sql([FX.sourceMain, FX.sourceAmb])}
  `;
}

export async function seedScanContractFixtures(sql: Sql): Promise<void> {
  await cleanupScanContractFixtures(sql);

  await sql`
    INSERT INTO public.source_files (
      id,
      file_type,
      file_name,
      checksum,
      source_system,
      imported_by,
      notes
    )
    VALUES
      (
        ${FX.sourceMain}::uuid,
        'test',
        'scan-contract-main.csv',
        'scan_contract_checksum_main_v1',
        'contract-test',
        null,
        'scan contract fixture'
      ),
      (
        ${FX.sourceAmb}::uuid,
        'test',
        'scan-contract-amb.csv',
        'scan_contract_checksum_amb_v1',
        'contract-test',
        null,
        'scan contract ambiguous fixture'
      )
  `;

  await sql`
    INSERT INTO public.shipments (
      id,
      source_file_id,
      shipment_no,
      shipper_code,
      shipper_name,
      receiver_code,
      receiver_name,
      delivery_date,
      scheduled_ship_date,
      status,
      remarks,
      issue_no,
      supplier,
      part_no,
      part_name,
      quantity,
      due_date
    )
    VALUES
      (
        ${FX.shipmentMain}::uuid,
        ${FX.sourceMain}::uuid,
        'SCAN-CT-MAIN',
        null,
        'Contract Test',
        null,
        null,
        null,
        null,
        'imported',
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ),
      (
        ${FX.shipmentAmb}::uuid,
        ${FX.sourceAmb}::uuid,
        'SCAN-CT-AMB',
        null,
        'Contract Test Amb',
        null,
        null,
        null,
        null,
        'imported',
        null,
        null,
        null,
        null,
        null,
        null,
        null
      )
  `;

  await sql`
    INSERT INTO public.shipment_items (
      id,
      shipment_id,
      line_no,
      trace_id,
      part_no,
      part_name,
      quantity_expected,
      quantity_unit,
      unload_location,
      delivery_date,
      lot_no,
      external_barcode,
      match_key,
      status,
      source_row_no
    )
    VALUES
      (
        ${FX.itemIdem}::uuid,
        ${FX.shipmentMain}::uuid,
        1,
        'tr-ct-idem-100',
        'MATCH-IDEM',
        'idempotency only',
        1,
        'ea',
        null,
        null,
        null,
        null,
        null,
        'planned',
        1
      ),
      (
        ${FX.itemMatched}::uuid,
        ${FX.shipmentMain}::uuid,
        2,
        'tr-ct-match-101',
        'MATCH-001',
        'matched line',
        1,
        'ea',
        null,
        null,
        null,
        null,
        null,
        'planned',
        2
      ),
      (
        ${FX.itemWrongPart}::uuid,
        ${FX.shipmentMain}::uuid,
        3,
        'tr-ct-wp-102',
        'WP-INTERNAL',
        'wrong part line',
        1,
        'ea',
        null,
        null,
        null,
        'EXT-BAR-WP',
        null,
        'planned',
        3
      ),
      (
        ${FX.itemWrongLoc}::uuid,
        ${FX.shipmentMain}::uuid,
        4,
        'tr-ct-loc-103',
        'LOC-001',
        'wrong loc line',
        1,
        'ea',
        'WH-EXPECTED',
        null,
        null,
        null,
        null,
        'planned',
        4
      ),
      (
        ${FX.itemMatchKey}::uuid,
        ${FX.shipmentMain}::uuid,
        5,
        'tr-ct-mk-104',
        'REAL-MK-PN',
        'match_key fallback',
        1,
        'ea',
        null,
        null,
        null,
        null,
        'CONTRACT-MK-LOOKUP',
        'planned',
        5
      ),
      (
        ${FX.itemAmb1}::uuid,
        ${FX.shipmentAmb}::uuid,
        1,
        'tr-ct-amb-201',
        'AMB-SAME',
        'amb a',
        1,
        'ea',
        null,
        null,
        null,
        null,
        null,
        'planned',
        1
      ),
      (
        ${FX.itemAmb2}::uuid,
        ${FX.shipmentAmb}::uuid,
        2,
        'tr-ct-amb-202',
        'AMB-SAME',
        'amb b',
        1,
        'ea',
        null,
        null,
        null,
        null,
        null,
        'planned',
        2
      )
  `;

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
    WHERE si.id IN ${sql(ITEM_IDS)}
    ON CONFLICT (shipment_item_id) DO NOTHING
  `;
}
