import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { supabase } from "@logistics-erp/db";
import type { ShipmentRow } from "./registerShipmentEffects.js";
import { registerShipmentEffects } from "./registerShipmentEffects.js";

const CSV_COLUMNS = [
  "issue_no",
  "supplier",
  "part_no",
  "part_name",
  "quantity",
  "due_date",
] as const;

type CsvRow = Record<string, string | undefined>;

function toIsoDate(value: string): string {
  if (!value?.trim()) return "";
  const trimmed = String(value).trim();
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed;
  return date.toISOString().slice(0, 10);
}

function parseQuantity(value: string | undefined): number {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
    throw new Error(
      `[@logistics-erp/importer] Invalid quantity: "${value}". Must be a non-negative number.`
    );
  }
  return Math.floor(n);
}

function rowToRecord(row: CsvRow): Record<(typeof CSV_COLUMNS)[number], string | number> {
  const issueNo = String(row.issue_no ?? "").trim();
  const partNo = String(row.part_no ?? "").trim();
  if (!issueNo || !partNo) {
    throw new Error(
      `[@logistics-erp/importer] Row missing issue_no or part_no: ${JSON.stringify(row)}`
    );
  }
  const quantity = parseQuantity(row.quantity);
  const dueDate = toIsoDate(row.due_date ?? "");
  return {
    issue_no: issueNo,
    supplier: String(row.supplier ?? "").trim(),
    part_no: partNo,
    part_name: String(row.part_name ?? "").trim(),
    quantity,
    due_date: dueDate,
  };
}

export interface ImportShipmentsResult {
  total: number
  inserted: number
  rows: Array<Record<(typeof CSV_COLUMNS)[number], string | number>>
  /** upsert で返却された shipment 行（id 付き）。select 時にのみ入る。 */
  shipments?: ShipmentRow[]
  /** registerEffects: true のとき、各行に対する effect 登録結果。 */
  effects?: Awaited<ReturnType<typeof registerShipmentEffects>>[]
}

export interface ImportShipmentsOptions {
  /** true の場合、各 shipment について stock_movements / inventory / trace_events を登録する。デフォルト false。 */
  registerEffects?: boolean
}

/**
 * Read a CSV file and upsert rows into the "shipments" table.
 * Uses issue_no + part_no as the conflict target.
 *
 * @param options.registerEffects - true の場合、各 shipment について registerShipmentEffects を実行し、
 *   stock_movements / inventory / trace_events を登録する。デフォルト false（従来どおり shipment のみ）。
 */
export async function importShipments(
  csvPath: string,
  options?: ImportShipmentsOptions
): Promise<ImportShipmentsResult> {
  const registerEffects = options?.registerEffects === true;

  const rows: Array<Record<(typeof CSV_COLUMNS)[number], string | number>> = [];

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(csvPath);
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    stream
      .pipe(parser)
      .on("data", (row: CsvRow) => {
        try {
          rows.push(rowToRecord(row));
        } catch (err) {
          reject(err);
        }
      })
      .on("end", () => resolve())
      .on("error", reject);
    stream.on("error", reject);
  });

  if (rows.length === 0) {
    return { total: 0, inserted: 0, rows: [] };
  }

  const { data: upserted, error } = await supabase
    .from("shipments")
    .upsert(rows, { onConflict: "issue_no,part_no" })
    .select("id, issue_no, supplier, part_no, part_name, quantity, due_date");

  if (error) {
    throw new Error(
      `[@logistics-erp/importer] importShipments failed: ${error.message}`,
      { cause: error }
    );
  }

  const shipments = (upserted ?? []) as ShipmentRow[];

  const result: ImportShipmentsResult = {
    total: rows.length,
    inserted: shipments.length,
    rows,
    shipments,
  };

  // TODO(idempotency): registerEffects 有効時、2 回実行すると stock_movements / trace_events が重複する。
  // 対策案: source_type + source_ref + shipment_id + event_type の一意制約、importer_run_id、idempotency key。
  if (registerEffects && shipments.length > 0) {
    const effects: Awaited<ReturnType<typeof registerShipmentEffects>>[] = [];
    for (const row of shipments) {
      effects.push(await registerShipmentEffects(row));
    }
    result.effects = effects;
  }

  return result;
}
