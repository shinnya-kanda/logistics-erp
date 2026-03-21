import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import type { NormalizedShipmentLineInput, ShipmentItem } from "@logistics-erp/schema";
import { buildTraceId } from "@logistics-erp/schema";
import {
  findExpectedImportByChecksum,
  insertExpectedImportBundle,
} from "@logistics-erp/db";
import type { ShipmentEffectLineRow } from "./registerShipmentEffects.js";
import { registerShipmentEffects } from "./registerShipmentEffects.js";

export const CSV_COLUMNS = [
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

function parseQuantityExpected(value: string | undefined, ctx: string): number {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
    throw new Error(
      `[@logistics-erp/importer] ${ctx}: quantity_expected が不正です: "${value}"（0 以上の数値が必要です）`
    );
  }
  if (!Number.isInteger(n)) {
    throw new Error(
      `[@logistics-erp/importer] ${ctx}: quantity_expected は整数である必要があります: "${value}"`
    );
  }
  return n;
}

function csvRowToNormalized(
  row: CsvRow,
  sourceRowNo: number
): NormalizedShipmentLineInput {
  const issueNo = String(row.issue_no ?? "").trim();
  const partNo = String(row.part_no ?? "").trim();
  const supplier = String(row.supplier ?? "").trim();
  const partName = String(row.part_name ?? "").trim();
  const due = toIsoDate(row.due_date ?? "");

  if (!issueNo) {
    throw new Error(
      `[@logistics-erp/importer] 行 ${sourceRowNo}: issue_no が空です。`
    );
  }
  if (!partNo) {
    throw new Error(
      `[@logistics-erp/importer] 行 ${sourceRowNo}: part_no が空です。`
    );
  }

  const quantity_expected = parseQuantityExpected(
    row.quantity,
    `行 ${sourceRowNo} (part_no=${partNo})`
  );

  return {
    issue_no: issueNo,
    supplier,
    part_no: partNo,
    part_name: partName,
    quantity_expected,
    delivery_date: due,
    source_row_no: sourceRowNo,
  };
}

function validateBatchConsistency(lines: NormalizedShipmentLineInput[]): void {
  if (lines.length === 0) return;

  const issue = lines[0].issue_no;
  const supplier = lines[0].supplier;

  for (const line of lines) {
    if (line.issue_no !== issue) {
      throw new Error(
        `[@logistics-erp/importer] 同一 CSV 内の issue_no が一致しません。最初の行は "${issue}" ですが、行 ${line.source_row_no} は "${line.issue_no}" です。Phase1 では 1 ファイル = 1 出荷ヘッダのため、issue_no を統一してください。`
      );
    }
    if (line.supplier !== supplier) {
      throw new Error(
        `[@logistics-erp/importer] 同一 CSV 内の supplier が一致しません。行 ${line.source_row_no} を確認してください（Phase1 ではヘッダの shipper として 1 値に揃える必要があります）。`
      );
    }
  }
}

function earliestDeliveryDate(lines: NormalizedShipmentLineInput[]): string | null {
  const dates = lines
    .map((l) => l.delivery_date)
    .filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (dates.length === 0) return null;
  return [...dates].sort()[0] ?? null;
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? path;
}

export interface ImportShipmentsResult {
  total: number
  /** 作成された（または既存 checksum から読み戻した）明細件数 */
  inserted: number
  /** 正規化済み行（CSV 非依存の内部モデル） */
  normalizedLines: NormalizedShipmentLineInput[]
  source_file_id: string
  shipment_id: string
  items: ShipmentItem[]
  /** checksum 既存により DB insert をスキップした場合 true */
  from_existing_checksum?: boolean
  /** Phase0 互換: 明細相当の行（Phase1 では shipment_items ベース） */
  shipments?: ShipmentEffectLineRow[]
  /** registerEffects: true のときの effect 結果 */
  effects?: Awaited<ReturnType<typeof registerShipmentEffects>>[]
}

export interface ImportShipmentsOptions {
  /** true の場合、各明細について registerShipmentEffects を実行する。 */
  registerEffects?: boolean
  /** 既定 csv。file_type に使用 */
  file_type?: string
  source_system?: string
}

function linesToEffectRows(
  items: ShipmentItem[],
  headerId: string,
  issueNo: string,
  supplier: string | null
): ShipmentEffectLineRow[] {
  return items.map((item) => ({
    shipment_item_id: item.id,
    shipment_header_id: headerId,
    issue_no: issueNo,
    supplier,
    part_no: item.part_no,
    part_name: item.part_name,
    quantity: Number(item.quantity_expected),
    due_date: item.delivery_date ?? "",
  }));
}

/**
 * CSV を読み、Phase1 Expected Data（source_files + shipments ヘッダ + shipment_items）として取り込む。
 * 同一 checksum の再実行は冪等（既存行を返す）。
 *
 * registerEffects が true のとき、各 shipment_item に対し Phase0 と同様に
 * stock_movements / inventory / trace_events を明細単位で冪等登録する。
 */
export async function importShipments(
  csvPath: string,
  options?: ImportShipmentsOptions
): Promise<ImportShipmentsResult> {
  const registerEffects = options?.registerEffects === true;
  const file_type = options?.file_type ?? "csv";
  const source_system = options?.source_system ?? "csv_importer";

  const fileBuffer = await readFile(csvPath);
  const checksum = createHash("sha256").update(fileBuffer).digest("hex");
  const file_name = basename(csvPath);

  const records = parse(fileBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  if (records.length === 0) {
    return {
      total: 0,
      inserted: 0,
      normalizedLines: [],
      source_file_id: "",
      shipment_id: "",
      items: [],
    };
  }

  const normalizedLines: NormalizedShipmentLineInput[] = [];
  let rowNo = 2;
  for (const row of records) {
    normalizedLines.push(csvRowToNormalized(row, rowNo));
    rowNo += 1;
  }

  validateBatchConsistency(normalizedLines);

  const issueNo = normalizedLines[0].issue_no;
  const supplierHead = normalizedLines[0].supplier || null;
  const headerDelivery = earliestDeliveryDate(normalizedLines);

  const existing = await findExpectedImportByChecksum(checksum);
  let source_file_id: string;
  let shipment_id: string;
  let items: ShipmentItem[];
  let from_existing_checksum: boolean | undefined;

  if (existing) {
    source_file_id = existing.source_file_id;
    shipment_id = existing.shipment_id;
    items = existing.items;
    from_existing_checksum = true;
  } else {
    const bundle = await insertExpectedImportBundle({
      source: {
        file_name,
        file_type,
        source_system,
        checksum,
      },
      header: {
        shipment_no: issueNo,
        shipper_name: supplierHead,
        delivery_date: headerDelivery,
      },
      lines: normalizedLines.map((line, idx) => ({
        line_no: idx + 1,
        trace_id: buildTraceId(line.issue_no, line.part_no),
        part_no: line.part_no,
        part_name: line.part_name || null,
        quantity_expected: line.quantity_expected,
        delivery_date: line.delivery_date || null,
        source_row_no: line.source_row_no,
        match_key: null,
      })),
    });
    source_file_id = bundle.source_file_id;
    shipment_id = bundle.shipment_id;
    items = bundle.items;
  }

  const effectRows = linesToEffectRows(
    items,
    shipment_id,
    issueNo,
    supplierHead
  );

  const result: ImportShipmentsResult = {
    total: normalizedLines.length,
    inserted: items.length,
    normalizedLines,
    source_file_id,
    shipment_id,
    items,
    from_existing_checksum,
    shipments: effectRows,
  };

  if (registerEffects && items.length > 0) {
    const effects: Awaited<ReturnType<typeof registerShipmentEffects>>[] = [];
    for (const lineRow of effectRows) {
      effects.push(await registerShipmentEffects(lineRow));
    }
    result.effects = effects;
  }

  return result;
}
