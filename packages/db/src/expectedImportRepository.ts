import postgres from "postgres";
import type { ShipmentItem } from "@logistics-erp/schema";
import { loadEnv } from "./loadEnv.js";

loadEnv();

export type ExpectedImportLineInput = {
  line_no: number
  trace_id: string
  part_no: string
  part_name: string | null
  quantity_expected: number
  quantity_unit?: string | null
  unload_location?: string | null
  delivery_date: string | null
  lot_no?: string | null
  external_barcode?: string | null
  match_key?: string | null
  source_row_no: number
};

export type ExpectedImportBundleInput = {
  source: {
    file_name: string
    file_type: string
    source_system: string
    checksum: string | null
    imported_by?: string | null
    notes?: string | null
  }
  header: {
    shipment_no: string
    shipper_name: string | null
    shipper_code?: string | null
    receiver_code?: string | null
    receiver_name?: string | null
    delivery_date: string | null
    scheduled_ship_date?: string | null
    remarks?: string | null
  }
  lines: ExpectedImportLineInput[]
};

export type ExpectedImportResult = {
  source_file_id: string
  shipment_id: string
  items: ShipmentItem[]
  /** true のとき checksum 既存のため DB 新規 insert は行っていない */
  from_existing_checksum?: boolean
};

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "[@logistics-erp/db] Expected Data のトランザクション取込には DATABASE_URL（Postgres 接続文字列）が必要です。Supabase の Direct connection を .env に設定してください。"
    );
  }
  return url;
}

/**
 * checksum が既に存在する場合、source_files + shipments + shipment_items を読み戻す（冪等）。
 */
export async function findExpectedImportByChecksum(
  checksum: string
): Promise<ExpectedImportResult | null> {
  if (!checksum.trim()) return null;

  const sql = postgres(requireDatabaseUrl(), { max: 1 });
  try {
    const rows = await sql<
      { source_file_id: string; shipment_id: string }[]
    >`
      SELECT sf.id AS source_file_id, s.id AS shipment_id
      FROM public.source_files sf
      INNER JOIN public.shipments s ON s.source_file_id = sf.id
      WHERE sf.checksum = ${checksum}
      LIMIT 1
    `;

    const head = rows[0];
    if (!head) return null;

    const items = await sql<ShipmentItem[]>`
      SELECT *
      FROM public.shipment_items
      WHERE shipment_id = ${head.shipment_id}
      ORDER BY source_row_no ASC NULLS LAST, line_no ASC NULLS LAST
    `;

    return {
      source_file_id: head.source_file_id,
      shipment_id: head.shipment_id,
      items,
      from_existing_checksum: true,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * 1 トランザクションで source_files → shipments（ヘッダ）→ shipment_items を作成する。
 */
export async function insertExpectedImportBundle(
  input: ExpectedImportBundleInput
): Promise<ExpectedImportResult> {
  if (input.lines.length === 0) {
    throw new Error(
      "[@logistics-erp/db] insertExpectedImportBundle: 明細が 0 件です。"
    );
  }

  const sql = postgres(requireDatabaseUrl(), { max: 1 });

  try {
    return await sql.begin(async (tx) => {
      const q = tx as unknown as typeof sql;
      const [sf] = await q<{ id: string }[]>`
        INSERT INTO public.source_files (
          file_type,
          file_name,
          checksum,
          source_system,
          imported_by,
          notes
        )
        VALUES (
          ${input.source.file_type},
          ${input.source.file_name},
          ${input.source.checksum},
          ${input.source.source_system},
          ${input.source.imported_by ?? null},
          ${input.source.notes ?? null}
        )
        RETURNING id
      `;

      const [sh] = await q<{ id: string }[]>`
        INSERT INTO public.shipments (
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
        VALUES (
          ${sf.id},
          ${input.header.shipment_no},
          ${input.header.shipper_code ?? null},
          ${input.header.shipper_name},
          ${input.header.receiver_code ?? null},
          ${input.header.receiver_name ?? null},
          ${input.header.delivery_date},
          ${input.header.scheduled_ship_date ?? null},
          ${"imported"},
          ${input.header.remarks ?? null},
          ${null},
          ${null},
          ${null},
          ${null},
          ${null},
          ${null}
        )
        RETURNING id
      `;

      for (const line of input.lines) {
        await q`
          INSERT INTO public.shipment_items (
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
          VALUES (
            ${sh.id},
            ${line.line_no},
            ${line.trace_id},
            ${line.part_no},
            ${line.part_name},
            ${String(line.quantity_expected)},
            ${line.quantity_unit ?? null},
            ${line.unload_location ?? null},
            ${line.delivery_date},
            ${line.lot_no ?? null},
            ${line.external_barcode ?? null},
            ${line.match_key ?? null},
            ${"planned"},
            ${line.source_row_no}
          )
        `;
      }

      const items = await q<ShipmentItem[]>`
        SELECT *
        FROM public.shipment_items
        WHERE shipment_id = ${sh.id}
        ORDER BY source_row_no ASC NULLS LAST, line_no ASC NULLS LAST
      `;

      return {
        source_file_id: sf.id,
        shipment_id: sh.id,
        items,
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
