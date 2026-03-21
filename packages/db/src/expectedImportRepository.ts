import postgres from "postgres";
import type { ShipmentItem } from "@logistics-erp/schema";
import { loadEnv } from "./loadEnv.js";

loadEnv();

function isPostgresError(e: unknown): e is postgres.PostgresError {
  return (
    typeof e === "object" &&
    e !== null &&
    "name" in e &&
    (e as { name: string }).name === "PostgresError" &&
    "code" in e
  );
}

/** 一意制約名・メッセージから checksum 重複（並行取込レース）を推定 */
function isChecksumUniqueViolation(err: unknown): boolean {
  if (!isPostgresError(err) || err.code !== "23505") return false;
  const c = (err.constraint_name ?? "").toLowerCase();
  const d = (err.detail ?? "").toLowerCase();
  const m = (err.message ?? "").toLowerCase();
  return (
    c.includes("checksum") ||
    c.includes("uq_source_files_checksum") ||
    d.includes("checksum") ||
    m.includes("uq_source_files_checksum")
  );
}

function formatRollbackError(err: unknown): Error {
  if (isPostgresError(err)) {
    const parts = [
      "[@logistics-erp/db] Expected Data 取込を中止しました（Postgres トランザクションはロールバック済み）。",
      `code=${err.code}`,
      err.table_name ? `table=${err.table_name}` : null,
      err.constraint_name ? `constraint=${err.constraint_name}` : null,
      err.column_name ? `column=${err.column_name}` : null,
      err.detail ? `detail=${err.detail}` : null,
      err.hint ? `hint=${err.hint}` : null,
    ].filter(Boolean);
    return new Error(parts.join(" "), { cause: err });
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new Error(
    `[@logistics-erp/db] Expected Data 取込失敗（トランザクションはロールバック済み）: ${msg}`,
    { cause: err instanceof Error ? err : undefined }
  );
}

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

function assertBundleLinesValid(lines: ExpectedImportLineInput[]): void {
  for (const line of lines) {
    const pn = String(line.part_no ?? "").trim();
    if (!pn) {
      throw new Error(
        "[@logistics-erp/db] insertExpectedImportBundle: part_no が空です（line_no=" +
          String(line.line_no) +
          ", source_row_no=" +
          String(line.source_row_no) +
          "）。"
      );
    }
    const q = line.quantity_expected;
    if (!Number.isFinite(q) || !Number.isInteger(q) || q <= 0) {
      throw new Error(
        "[@logistics-erp/db] insertExpectedImportBundle: quantity_expected は 1 以上の整数である必要があります（part_no=" +
          pn +
          ", line_no=" +
          String(line.line_no) +
          "）。"
      );
    }
    if (!String(line.trace_id ?? "").trim()) {
      throw new Error(
        "[@logistics-erp/db] insertExpectedImportBundle: trace_id が空です（part_no=" + pn + "）。"
      );
    }
  }
}

export type ExpectedImportResult = {
  source_file_id: string
  shipment_id: string
  items: ShipmentItem[]
  /** true のとき checksum 既存のため DB 新規 insert は行っていない */
  from_existing_checksum?: boolean
};

export function requireDatabaseUrl(): string {
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
    } catch (err) {
      const short = checksum.length > 12 ? `${checksum.slice(0, 12)}…` : checksum;
      throw new Error(
        `[@logistics-erp/db] findExpectedImportByChecksum 失敗（checksum=${short}）。DATABASE_URL と DB スキーマ（Phase1 SQL 適用済みか）を確認してください。`,
        { cause: err instanceof Error ? err : undefined }
      );
    }
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

  assertBundleLinesValid(input.lines);

  const sql = postgres(requireDatabaseUrl(), { max: 1 });

  try {
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
    } catch (err) {
      const ck = input.source.checksum;
      if (ck && isChecksumUniqueViolation(err)) {
        const found = await findExpectedImportByChecksum(ck);
        if (found) {
          return {
            source_file_id: found.source_file_id,
            shipment_id: found.shipment_id,
            items: found.items,
            from_existing_checksum: true,
          };
        }
      }
      throw formatRollbackError(err);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
