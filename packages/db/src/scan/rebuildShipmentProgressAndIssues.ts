import postgres from "postgres";
import { requireDatabaseUrl } from "../expectedImportRepository.js";

type Sql = ReturnType<typeof postgres>;

type ShipmentItemForRebuild = {
  id: string
  shipment_id: string
  trace_id: string
  part_no: string
  quantity_expected: string
  quantity_unit: string | null
  unload_location: string | null
  match_key: string | null
  external_barcode: string | null
  status: string
};

type ProgressStatus =
  | "planned"
  | "in_progress"
  | "matched"
  | "shortage"
  | "excess"
  | "wrong_part"
  | "wrong_location"
  | "unknown_item";

export type RebuildShipmentResult = {
  shipment_id: string
  item_count: number
  progress_rebuilt_count: number
  issues_rebuilt_count: number
  statuses: Record<ProgressStatus, number>
};

type RebuildAggregateRow = {
  shipment_item_id: string
  trace_id: string
  quantity_expected: string
  quantity_scanned_total: string
  first_scanned_at: string | null
  last_scanned_at: string | null
  completed_at: string | null
  progress_status: ProgressStatus
};

type IssueForRebuild = {
  shipment_item_id: string
  trace_id: string
  issue_type: ProgressStatus
  severity: string
  expected_value: string | null
  actual_value: string
  detected_at: string
};

const EMPTY_STATUSES: Record<ProgressStatus, number> = {
  planned: 0,
  in_progress: 0,
  matched: 0,
  shortage: 0,
  excess: 0,
  wrong_part: 0,
  wrong_location: 0,
  unknown_item: 0,
};

function classifyProgress(actual: number, expected: number): ProgressStatus {
  if (actual <= 0) return "planned";
  if (actual === expected) return "matched";
  if (actual > expected) return "excess";
  return "shortage";
}

function toFiniteNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildAggregates(
  items: ShipmentItemForRebuild[],
  scanRows: {
    shipment_item_id: string
    scanned_code: string
    scanned_part_no: string | null
    quantity_scanned: string | null
    unload_location_scanned: string | null
    result_status: string
    scanned_at: string
  }[]
): RebuildAggregateRow[] {
  const byItem = new Map<
    string,
    {
      total: number
      first: string | null
      last: string | null
      hasWrongPart: boolean
      hasWrongLocation: boolean
    }
  >();
  const itemsById = new Map(items.map((item) => [item.id, item]));

  for (const row of scanRows) {
    const current = byItem.get(row.shipment_item_id) ?? {
      total: 0,
      first: null,
      last: null,
      hasWrongPart: false,
      hasWrongLocation: false,
    };
    const item = itemsById.get(row.shipment_item_id);
    current.total += row.quantity_scanned === null
      ? 1
      : toFiniteNumber(row.quantity_scanned);
    if (item && row.scanned_part_no?.trim()) {
      current.hasWrongPart =
        current.hasWrongPart ||
        row.scanned_part_no.trim().toUpperCase() !==
          item.part_no.trim().toUpperCase();
    }
    if (
      item &&
      item.unload_location?.trim() &&
      row.unload_location_scanned?.trim()
    ) {
      current.hasWrongLocation =
        current.hasWrongLocation ||
        row.unload_location_scanned.trim().toUpperCase() !==
          item.unload_location.trim().toUpperCase();
    }
    if (!current.first || row.scanned_at < current.first) {
      current.first = row.scanned_at;
    }
    if (!current.last || row.scanned_at > current.last) {
      current.last = row.scanned_at;
    }
    byItem.set(row.shipment_item_id, current);
  }

  return items.map((item) => {
    const scan = byItem.get(item.id) ?? {
      total: 0,
      first: null,
      last: null,
      hasWrongPart: false,
      hasWrongLocation: false,
    };
    const expected = toFiniteNumber(item.quantity_expected);
    const status = scan.hasWrongPart
      ? "wrong_part"
      : scan.hasWrongLocation
        ? "wrong_location"
        : classifyProgress(scan.total, expected);
    return {
      shipment_item_id: item.id,
      trace_id: item.trace_id,
      quantity_expected: item.quantity_expected,
      quantity_scanned_total: String(scan.total),
      first_scanned_at: scan.first,
      last_scanned_at: scan.last,
      completed_at: status === "matched" ? scan.last : null,
      progress_status: status,
    };
  });
}

function countStatuses(
  aggregates: RebuildAggregateRow[]
): Record<ProgressStatus, number> {
  const statuses = { ...EMPTY_STATUSES };
  for (const row of aggregates) {
    statuses[row.progress_status] += 1;
  }
  return statuses;
}

export async function rebuildShipmentProgressAndIssuesWithSql(
  sql: Sql,
  shipmentId: string
): Promise<RebuildShipmentResult> {
  const shipmentIdTrimmed = shipmentId.trim();
  if (!shipmentIdTrimmed) {
    throw new Error("[@logistics-erp/db] rebuildShipment: shipmentId is required.");
  }

  return await sql.begin(async (tx) => {
    const q = tx as unknown as typeof sql;
    const items = await q<ShipmentItemForRebuild[]>`
      SELECT
        id,
        shipment_id,
        trace_id,
        part_no,
        quantity_expected::text AS quantity_expected,
        quantity_unit,
        unload_location,
        match_key,
        external_barcode,
        status
      FROM public.shipment_items
      WHERE shipment_id = ${shipmentIdTrimmed}::uuid
      ORDER BY source_row_no ASC NULLS LAST, line_no ASC NULLS LAST, id ASC
    `;

    if (items.length === 0) {
      return {
        shipment_id: shipmentIdTrimmed,
        item_count: 0,
        progress_rebuilt_count: 0,
        issues_rebuilt_count: 0,
        statuses: { ...EMPTY_STATUSES },
      };
    }

    const itemIds = items.map((item) => item.id);
    const scanRows = await q<
      {
        shipment_item_id: string
        scanned_code: string
        scanned_part_no: string | null
        quantity_scanned: string | null
        unload_location_scanned: string | null
        result_status: string
        scanned_at: string
      }[]
    >`
      SELECT
        shipment_item_id::text AS shipment_item_id,
        scanned_code,
        scanned_part_no,
        quantity_scanned::text AS quantity_scanned,
        unload_location_scanned,
        result_status,
        scanned_at::text AS scanned_at
      FROM public.scan_events
      WHERE shipment_item_id IN ${q(itemIds)}
      ORDER BY scanned_at ASC, created_at ASC, id ASC
    `;

    const unknownRows = await q<
      {
        scanned_code: string
        trace_id: string | null
        scanned_at: string
      }[]
    >`
      SELECT
        scanned_code,
        trace_id,
        scanned_at::text AS scanned_at
      FROM public.scan_events
      WHERE result_status = 'unknown'
        AND shipment_item_id IS NULL
        AND raw_payload->>'shipment_id' = ${shipmentIdTrimmed}
      ORDER BY scanned_at ASC, created_at ASC, id ASC
    `;

    const aggregates = buildAggregates(items, scanRows);

    await q`
      DELETE FROM public.shipment_item_progress
      WHERE shipment_item_id IN ${q(itemIds)}
    `;

    let progressRebuiltCount = 0;
    for (const row of aggregates) {
      await q`
        INSERT INTO public.shipment_item_progress (
          shipment_item_id,
          trace_id,
          quantity_expected,
          quantity_scanned_total,
          progress_status,
          first_scanned_at,
          last_scanned_at,
          completed_at
        )
        VALUES (
          ${row.shipment_item_id}::uuid,
          ${row.trace_id},
          ${row.quantity_expected}::numeric,
          ${row.quantity_scanned_total}::numeric,
          ${row.progress_status},
          ${row.first_scanned_at}::timestamptz,
          ${row.last_scanned_at}::timestamptz,
          ${row.completed_at}::timestamptz
        )
      `;
      progressRebuiltCount += 1;
    }

    await q`
      DELETE FROM public.shipment_item_issues
      WHERE shipment_item_id IN ${q(itemIds)}
        AND resolved_at IS NULL
    `;

    const issueRows: IssueForRebuild[] = aggregates
      .filter((row) =>
        row.progress_status === "shortage" ||
        row.progress_status === "excess" ||
        row.progress_status === "wrong_part" ||
        row.progress_status === "wrong_location"
      )
      .map((row) => ({
        shipment_item_id: row.shipment_item_id,
        trace_id: row.trace_id,
        issue_type: row.progress_status,
        severity: row.progress_status === "excess" ? "medium" : "high",
        expected_value:
          row.progress_status === "wrong_part" ||
          row.progress_status === "wrong_location"
            ? row.progress_status
            : row.quantity_expected,
        actual_value: row.quantity_scanned_total,
        detected_at: row.last_scanned_at ?? new Date().toISOString(),
      }));

    for (const row of unknownRows) {
      issueRows.push({
        shipment_item_id: items[0].id,
        trace_id: row.trace_id ?? items[0].trace_id,
        issue_type: "unknown_item",
        severity: "medium",
        expected_value: null,
        actual_value: `scanned_code: ${row.scanned_code}`,
        detected_at: row.scanned_at,
      });
    }

    let issuesRebuiltCount = 0;
    for (const row of issueRows) {
      await q`
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
          ${row.shipment_item_id}::uuid,
          ${row.trace_id},
          ${row.issue_type},
          ${row.severity},
          ${row.expected_value},
          ${row.actual_value},
          ${row.detected_at}::timestamptz
        )
      `;
      issuesRebuiltCount += 1;
    }

    return {
      shipment_id: shipmentIdTrimmed,
      item_count: items.length,
      progress_rebuilt_count: progressRebuiltCount,
      issues_rebuilt_count: issuesRebuiltCount,
      statuses: {
        ...countStatuses(aggregates),
        unknown_item: unknownRows.length,
      },
    };
  });
}

export async function rebuildShipmentProgressAndIssues(
  shipmentId: string
): Promise<RebuildShipmentResult> {
  const sql = postgres(requireDatabaseUrl(), { max: 1 });
  try {
    return await rebuildShipmentProgressAndIssuesWithSql(sql, shipmentId);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export const rebuildShipment = rebuildShipmentProgressAndIssues;
