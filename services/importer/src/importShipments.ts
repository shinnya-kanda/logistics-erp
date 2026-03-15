import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { supabase } from "@logistics-erp/db";

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
  total: number;
  inserted: number;
  rows: Array<Record<(typeof CSV_COLUMNS)[number], string | number>>;
}

/**
 * Read a CSV file and upsert rows into the "shipments" table.
 * Uses issue_no + part_no as the conflict target.
 */
export async function importShipments(csvPath: string): Promise<ImportShipmentsResult> {
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

  const { data, error } = await supabase
    .from("shipments")
    .upsert(rows, { onConflict: "issue_no,part_no" });

  if (error) {
    throw new Error(
      `[@logistics-erp/importer] importShipments failed: ${error.message}`,
      { cause: error }
    );
  }

  console.log("[@logistics-erp/importer] Inserted/updated rows:", rows.length);
  rows.forEach((r, i) => {
    console.log(`  ${i + 1}. issue_no=${r.issue_no} part_no=${r.part_no} quantity=${r.quantity} due_date=${r.due_date}`);
  });

  return {
    total: rows.length,
    inserted: data?.length ?? rows.length,
    rows,
  };
}
