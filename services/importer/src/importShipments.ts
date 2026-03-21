import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import type { NormalizedShipmentLineInput, ShipmentItem } from "@logistics-erp/schema";
import { buildTraceId } from "@logistics-erp/schema";
import {
  ensureShipmentItemProgressForShipmentId,
  findExpectedImportByChecksum,
  insertExpectedImportBundle,
} from "@logistics-erp/db";
import type { ShipmentEffectLineRow } from "./registerShipmentEffects.js";
import { registerShipmentEffects } from "./registerShipmentEffects.js";
import { importLogError, importLogInfo, importLogWarn } from "./importLog.js";

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
  if (Number.isNaN(n) || !Number.isFinite(n) || n <= 0) {
    throw new Error(
      `[@logistics-erp/importer] ${ctx}: quantity（quantity_expected）は 1 以上の整数である必要があります。入力値: "${value ?? ""}"`
    );
  }
  if (!Number.isInteger(n)) {
    throw new Error(
      `[@logistics-erp/importer] ${ctx}: quantity は整数である必要があります: "${value}"`
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
      `[@logistics-erp/importer] 行 ${sourceRowNo}: part_no は必須です（空・空白のみは不可）。`
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

/** 1 行目に必須列が存在するか（ヘッダ検証） */
function assertRequiredCsvColumns(sampleRow: CsvRow): void {
  for (const col of CSV_COLUMNS) {
    if (!(col in sampleRow)) {
      throw new Error(
        `[@logistics-erp/importer] CSV ヘッダに必須列 "${col}" がありません。必要な列: ${CSV_COLUMNS.join(", ")}`
      );
    }
  }
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
  const file_name = basename(csvPath);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(csvPath);
  } catch (err) {
    importLogError("CSV ファイルの読み込みに失敗しました", {
      phase: "read_file",
      file: file_name,
      path: csvPath,
    });
    throw new Error(
      `[@logistics-erp/importer] CSV を読み込めません: ${csvPath}`,
      { cause: err instanceof Error ? err : undefined }
    );
  }

  const checksum = createHash("sha256").update(fileBuffer).digest("hex");
  const checksumShort =
    checksum.length > 16 ? `${checksum.slice(0, 16)}…` : checksum;

  let records: CsvRow[];
  try {
    records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[];
  } catch (err) {
    importLogError("CSV のパースに失敗しました", {
      phase: "parse",
      file: file_name,
      checksum: checksumShort,
    });
    throw new Error(
      `[@logistics-erp/importer] CSV の形式が不正です: ${file_name}`,
      { cause: err instanceof Error ? err : undefined }
    );
  }

  records = records.map((row) => {
    const next: CsvRow = {};
    for (const [k, v] of Object.entries(row)) {
      next[k.replace(/^\uFEFF/, "")] = v;
    }
    return next;
  });

  if (records.length === 0) {
    importLogWarn("データ行がありません（ヘッダのみまたは空ファイル）", {
      phase: "validate",
      file: file_name,
      checksum: checksumShort,
    });
    return {
      total: 0,
      inserted: 0,
      normalizedLines: [],
      source_file_id: "",
      shipment_id: "",
      items: [],
    };
  }

  try {
    assertRequiredCsvColumns(records[0] as CsvRow);
  } catch (err) {
    importLogError("CSV ヘッダ検証に失敗しました", {
      phase: "validate_header",
      file: file_name,
      checksum: checksumShort,
    });
    throw err;
  }

  const normalizedLines: NormalizedShipmentLineInput[] = [];
  let rowNo = 2;
  try {
    for (const row of records) {
      normalizedLines.push(csvRowToNormalized(row, rowNo));
      rowNo += 1;
    }
    validateBatchConsistency(normalizedLines);
  } catch (err) {
    importLogError("行の正規化またはバッチ整合性チェックに失敗しました", {
      phase: "validate_rows",
      file: file_name,
      checksum: checksumShort,
    });
    throw err;
  }

  const issueNo = normalizedLines[0].issue_no;
  const supplierHead = normalizedLines[0].supplier || null;
  const headerDelivery = earliestDeliveryDate(normalizedLines);

  let source_file_id: string;
  let shipment_id: string;
  let items: ShipmentItem[];
  let from_existing_checksum: boolean | undefined;

  try {
    const existing = await findExpectedImportByChecksum(checksum);
    if (existing) {
      importLogInfo(
        "同一 checksum の source_files が既存のため DB INSERT をスキップ（冪等）",
        {
          phase: "db_idempotent_hit",
          file: file_name,
          checksum: checksumShort,
          source_file_id: existing.source_file_id,
          shipment_id: existing.shipment_id,
          item_count: existing.items.length,
        }
      );
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
      if (bundle.from_existing_checksum) {
        from_existing_checksum = true;
        importLogInfo(
          "INSERT 時に checksum 一意制約で競合したため既存取込を返しました（並行実行の冪等扱い）",
          {
            phase: "db_race_recovered",
            file: file_name,
            checksum: checksumShort,
            source_file_id: bundle.source_file_id,
            shipment_id: bundle.shipment_id,
          }
        );
      } else {
        importLogInfo("Expected Data をトランザクションで登録しました", {
          phase: "db_commit",
          file: file_name,
          checksum: checksumShort,
          source_file_id: bundle.source_file_id,
          shipment_id: bundle.shipment_id,
          item_count: bundle.items.length,
        });
      }
    }
  } catch (err) {
    importLogError("Expected Data の DB 処理に失敗しました（INSERT はロールバック済みの場合があります）", {
      phase: "db",
      file: file_name,
      checksum: checksumShort,
    });
    throw err;
  }

  if (shipment_id) {
    try {
      await ensureShipmentItemProgressForShipmentId(shipment_id);
      importLogInfo("shipment_item_progress を冪等シードしました", {
        phase: "progress_seed",
        file: file_name,
        shipment_id,
      });
    } catch (err) {
      importLogError(
        "shipment_item_progress のシードに失敗しました（Phase2 の SQL 適用と DATABASE_URL を確認）",
        {
          phase: "progress_seed",
          file: file_name,
          shipment_id,
        }
      );
      throw err;
    }
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
    for (let i = 0; i < effectRows.length; i++) {
      const lineRow = effectRows[i];
      try {
        effects.push(await registerShipmentEffects(lineRow));
      } catch (err) {
        importLogError(
          "registerEffects 失敗 — Expected Data は既にコミット済みです。同一 shipment_item に対する再実行は idempotency_key で安全に再試行できます",
          {
            phase: "register_effects",
            file: file_name,
            checksum: checksumShort,
            line_index: i + 1,
            line_total: effectRows.length,
            shipment_item_id: lineRow.shipment_item_id,
            part_no: lineRow.part_no,
            shipment_id: shipment_id,
          }
        );
        throw new Error(
          `[@logistics-erp/importer] registerEffects 失敗: 明細 ${i + 1}/${effectRows.length} part_no=${lineRow.part_no} shipment_item_id=${lineRow.shipment_item_id}`,
          { cause: err instanceof Error ? err : undefined }
        );
      }
    }
    result.effects = effects;
    importLogInfo("registerEffects 完了", {
      phase: "effects_done",
      file: file_name,
      checksum: checksumShort,
      effect_count: effects.length,
    });
  }

  return result;
}
