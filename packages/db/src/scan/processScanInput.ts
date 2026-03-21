import postgres from "postgres";
import type { JSONValue } from "postgres";
import type { ShipmentItem } from "@logistics-erp/schema";
import {
  validateScanInput,
  type ScanInputPayload,
  type ScanEventRow,
  type ShipmentItemIssueRow,
  type ShipmentItemMatchResult,
  type ShipmentItemProgressRow,
  type VerificationResult,
} from "@logistics-erp/schema";
import { requireDatabaseUrl } from "../expectedImportRepository.js";
import { scanLogError, scanLogInfo, scanLogWarn } from "../scanLog.js";
import { matchShipmentItemForScan } from "./matchShipmentItemForScan.js";
import { verifyScanAgainstShipmentItem } from "./verifyScanAgainstShipmentItem.js";

export type ProcessScanOutput = {
  scanEvent: ScanEventRow
  match: ShipmentItemMatchResult
  verification: VerificationResult | null
  progress: ShipmentItemProgressRow | null
  issue: ShipmentItemIssueRow | null
}

function mergePayload(
  input: ScanInputPayload,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return { ...(input.raw_payload ?? {}), ...extra };
}

/**
 * スキャン 1 件を受理し、scan_events 保存 →（マッチ時）progress / issue 更新まで行う。
 * 単一 Postgres トランザクションで整合性を取る。
 */
export async function processScanInput(rawBody: unknown): Promise<ProcessScanOutput> {
  const input = validateScanInput(rawBody);
  const quantityDelta = input.quantity_scanned ?? 1;
  const scannedAt =
    input.scanned_at?.trim() ||
    new Date().toISOString();

  scanLogInfo("scan accepted", {
    scan_type: input.scan_type,
    scanned_code: input.scanned_code,
    scope_shipment_id: input.scope_shipment_id ?? undefined,
  });

  const sql = postgres(requireDatabaseUrl(), { max: 1 });

  try {
    const match = await matchShipmentItemForScan(sql, input);

    if (match.kind === "ambiguous") {
      scanLogWarn("match ambiguous — shipment_item_id は付与せず保存", {
        candidate_count: match.candidate_ids.length,
      });
      return await insertScanOnly(sql, input, match, scannedAt, "unknown", quantityDelta);
    }

    if (match.kind === "none") {
      scanLogWarn("match none — unmatched として raw scan のみ保存", {});
      return await insertScanOnly(sql, input, match, scannedAt, "unknown", quantityDelta);
    }

    const item = await fetchShipmentItem(sql, match.shipment_item_id);
    if (!item) {
      scanLogError("match unique だが shipment_item が取得できません", {
        shipment_item_id: match.shipment_item_id,
      });
      return await insertScanOnly(
        sql,
        input,
        { kind: "none" },
        scannedAt,
        "unknown",
        quantityDelta
      );
    }

    await seedProgressIfMissing(sql, item.id);

    const progressRow = await fetchProgress(sql, item.id);
    if (!progressRow) {
      throw new Error(
        "[@logistics-erp/db] shipment_item_progress が存在しません。ensureShipmentItemProgressForShipmentId を先に実行してください。"
      );
    }

    const currentTotal = Number(progressRow.quantity_scanned_total);
    const verification = verifyScanAgainstShipmentItem(
      item,
      input,
      Number.isFinite(currentTotal) ? currentTotal : 0,
      quantityDelta
    );

    if (verification.status === "unknown") {
      scanLogWarn("verification unknown", {
        shipment_item_id: item.id,
        notes: verification.notes ?? "",
      });
    } else if (verification.status === "matched") {
      scanLogInfo("verification matched", { shipment_item_id: item.id });
    } else {
      scanLogWarn("verification mismatch", {
        shipment_item_id: item.id,
        status: verification.status,
      });
    }

    try {
      return await sql.begin(async (tx) => {
        const q = tx as unknown as typeof sql;

        const rawPayload = mergePayload(input, {
          match_kind: match.kind,
          verification_status: verification.status,
          verification_notes: verification.notes ?? null,
        });

        const [scanEvent] = await q<ScanEventRow[]>`
          INSERT INTO public.scan_events (
            trace_id,
            shipment_item_id,
            scan_type,
            scanned_code,
            scanned_part_no,
            quantity_scanned,
            quantity_unit,
            unload_location_scanned,
            result_status,
            device_id,
            operator_id,
            operator_name,
            scanned_at,
            raw_payload
          )
          VALUES (
            ${input.trace_id ?? item.trace_id},
            ${item.id},
            ${input.scan_type},
            ${input.scanned_code},
            ${input.scanned_part_no ?? null},
            ${String(quantityDelta)},
            ${input.quantity_unit ?? null},
            ${input.unload_location_scanned ?? null},
            ${verification.status},
            ${input.device_id ?? null},
            ${input.operator_id ?? null},
            ${input.operator_name ?? null},
            ${scannedAt}::timestamptz,
            ${sql.json(rawPayload as JSONValue)}
          )
          RETURNING *
        `;

        const shouldIncrementQuantity =
          verification.status === "matched" ||
          verification.status === "shortage" ||
          verification.status === "excess";

        const expectedQty = Number(item.quantity_expected);
        const newTotal = shouldIncrementQuantity
          ? (Number.isFinite(currentTotal) ? currentTotal : 0) + quantityDelta
          : Number.isFinite(currentTotal)
            ? currentTotal
            : 0;

        let newProgressStatus: string = verification.status;
        const shouldSetCompleted =
          verification.status === "matched" && newTotal === expectedQty;

        if (verification.status === "matched" && newTotal === expectedQty) {
          newProgressStatus = "matched";
        } else if (verification.status === "shortage") {
          newProgressStatus = "shortage";
        } else if (verification.status === "excess") {
          newProgressStatus = "excess";
        } else if (verification.status === "wrong_part") {
          newProgressStatus = "wrong_part";
        } else if (verification.status === "wrong_location") {
          newProgressStatus = "wrong_location";
        } else if (verification.status === "unknown") {
          newProgressStatus = progressRow.progress_status;
        }

        const qtyTotalStr = shouldIncrementQuantity
          ? String(newTotal)
          : progressRow.quantity_scanned_total;

        const [progress] = await q<ShipmentItemProgressRow[]>`
          UPDATE public.shipment_item_progress
          SET
            quantity_scanned_total = ${qtyTotalStr}::numeric,
            progress_status = ${newProgressStatus},
            first_scanned_at = COALESCE(first_scanned_at, ${scannedAt}::timestamptz),
            last_scanned_at = ${scannedAt}::timestamptz,
            completed_at = CASE
              WHEN ${shouldSetCompleted} THEN ${scannedAt}::timestamptz
              ELSE shipment_item_progress.completed_at
            END
          WHERE shipment_item_id = ${item.id}
          RETURNING *
        `;

        scanLogInfo("progress updated", {
          shipment_item_id: item.id,
          progress_status: newProgressStatus,
          quantity_scanned_total: shouldIncrementQuantity ? newTotal : currentTotal,
        });

        let issue: ShipmentItemIssueRow | null = null;
        if (verification.issue && verification.status !== "matched") {
          const [issueRow] = await q<ShipmentItemIssueRow[]>`
            INSERT INTO public.shipment_item_issues (
              shipment_item_id,
              trace_id,
              issue_type,
              severity,
              expected_value,
              actual_value,
              detected_at
            )
            VALUES (
              ${item.id},
              ${item.trace_id},
              ${verification.issue.issue_type},
              ${verification.issue.severity},
              ${verification.issue.expected_value},
              ${verification.issue.actual_value},
              ${scannedAt}::timestamptz
            )
            RETURNING *
          `;
          issue = issueRow;
          scanLogInfo("issue created", {
            shipment_item_id: item.id,
            issue_type: verification.issue.issue_type,
          });
        }

        return {
          scanEvent,
          match,
          verification,
          progress,
          issue,
        };
      });
    } catch (err) {
      scanLogError("scan flow トランザクション失敗（ロールバック済み）", {
        shipment_item_id: item.id,
      });
      throw err;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function insertScanOnly(
  sql: ReturnType<typeof postgres>,
  input: ScanInputPayload,
  match: ShipmentItemMatchResult,
  scannedAt: string,
  resultStatus: string,
  quantityDelta: number
): Promise<ProcessScanOutput> {
  return await sql.begin(async (tx) => {
    const q = tx as unknown as typeof sql;
    const extra: Record<string, unknown> = { match_kind: match.kind };
    if (match.kind === "ambiguous") {
      extra.candidate_ids = match.candidate_ids;
    }
    const rawPayload = mergePayload(input, extra);

    const [scanEvent] = await q<ScanEventRow[]>`
      INSERT INTO public.scan_events (
        trace_id,
        shipment_item_id,
        scan_type,
        scanned_code,
        scanned_part_no,
        quantity_scanned,
        quantity_unit,
        unload_location_scanned,
        result_status,
        device_id,
        operator_id,
        operator_name,
        scanned_at,
        raw_payload
      )
      VALUES (
        ${input.trace_id ?? null},
        ${null},
        ${input.scan_type},
        ${input.scanned_code},
        ${input.scanned_part_no ?? null},
        ${String(quantityDelta)},
        ${input.quantity_unit ?? null},
        ${input.unload_location_scanned ?? null},
        ${resultStatus},
        ${input.device_id ?? null},
        ${input.operator_id ?? null},
        ${input.operator_name ?? null},
        ${scannedAt}::timestamptz,
        ${sql.json(rawPayload as JSONValue)}
      )
      RETURNING *
    `;

    scanLogInfo("scan_events のみ保存（progress / issue なし）", {
      scan_id: scanEvent.id,
      result_status: resultStatus,
    });

    return {
      scanEvent,
      match,
      verification: null,
      progress: null,
      issue: null,
    };
  });
}

async function fetchShipmentItem(
  sql: ReturnType<typeof postgres>,
  id: string
): Promise<ShipmentItem | null> {
  const rows = await sql<ShipmentItem[]>`
    SELECT * FROM public.shipment_items WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

async function fetchProgress(
  sql: ReturnType<typeof postgres>,
  shipmentItemId: string
): Promise<ShipmentItemProgressRow | null> {
  const rows = await sql<ShipmentItemProgressRow[]>`
    SELECT * FROM public.shipment_item_progress
    WHERE shipment_item_id = ${shipmentItemId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function seedProgressIfMissing(
  sql: ReturnType<typeof postgres>,
  shipmentItemId: string
): Promise<void> {
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
    WHERE si.id = ${shipmentItemId}::uuid
    ON CONFLICT (shipment_item_id) DO NOTHING
  `;
}
