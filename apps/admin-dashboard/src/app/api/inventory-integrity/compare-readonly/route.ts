import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createInventoryIntegrityFetchResult } from "../../../inventoryIntegrityEdgeClient";
import { mapEdgeProjectionResponse } from "../../../inventoryIntegrityEdgeResponseMapper";
import { adaptFetchResponseToPayload } from "../../../inventoryIntegrityFetchAdapter";
import { getInventoryIntegrityMockData } from "../../../inventoryIntegrityMockData";
import {
  createInventoryIntegrityReadOnlyEdgeRequest,
  createInventoryIntegrityReadOnlyEndpointContract,
} from "../../../inventoryIntegrityEdgeClient";
import { realReadOnlyProjectionSourceMetadata } from "../../../inventoryIntegritySource";
import type {
  InventoryCompareProjection,
  InventoryCompareSeverity,
  InventoryCompareStatus,
  InventoryIntegrityReadOnlyData,
} from "../../../inventoryIntegrityTypes";

type GuardResult =
  | { ok: true; token: string; warehouseCode: string }
  | { ok: false; status: 401 | 403; error: string };

type InventoryTransactionRow = {
  readonly transaction_type: string | null;
  readonly part_no: string | null;
  readonly quantity: number | string | null;
  readonly warehouse_code: string | null;
  readonly from_warehouse_code: string | null;
  readonly to_warehouse_code: string | null;
  readonly event_at: string | null;
  readonly created_at: string | null;
};

type InventoryCurrentRow = {
  readonly part_no: string | null;
  readonly warehouse_code: string | null;
  readonly quantity_on_hand: number | string | null;
  readonly updated_at: string | null;
};

type CompareQuantity = {
  readonly warehouseCode: string;
  readonly partNo: string;
  readonly transactionQuantity: number;
  readonly currentQuantity: number;
  readonly latestObservedAt: string;
};

const allowedRoles = new Set(["admin", "chief", "office"]);
const endpointPath = "/api/inventory-integrity/compare-readonly";

function extractBearerToken(req: NextRequest): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return match?.[1] ?? null;
}

function unavailable(status: 401 | 403, error: string): GuardResult {
  return { ok: false, status, error };
}

async function requireAdminDashboardRole(req: NextRequest): Promise<GuardResult> {
  const token = extractBearerToken(req);
  if (!token) return unavailable(401, "unauthorized");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return unavailable(401, "unauthorized");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return unavailable(401, "unauthorized");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, role, is_active, warehouse_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) return unavailable(403, "profile_unavailable");
  if (profile.user_id !== user.id) return unavailable(403, "profile_mismatch");
  if (profile.is_active !== true) return unavailable(403, "user_inactive");
  if (typeof profile.role !== "string" || !allowedRoles.has(profile.role)) {
    return unavailable(403, "role_not_allowed");
  }

  const warehouseCode =
    typeof profile.warehouse_code === "string" ? profile.warehouse_code.trim() : "";
  if (!warehouseCode) return unavailable(403, "warehouse_unavailable");

  return { ok: true, token, warehouseCode };
}

function toQuantity(value: number | string | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function compareKey(warehouseCode: string, partNo: string): string {
  return `${warehouseCode}::${partNo}`;
}

function addQuantity(
  quantities: Map<string, CompareQuantity>,
  warehouseCode: string,
  partNo: string,
  quantity: number,
  observedAt: string,
): void {
  if (!warehouseCode || !partNo || quantity === 0) return;

  const key = compareKey(warehouseCode, partNo);
  const existing = quantities.get(key);
  quantities.set(key, {
    warehouseCode,
    partNo,
    transactionQuantity: (existing?.transactionQuantity ?? 0) + quantity,
    currentQuantity: existing?.currentQuantity ?? 0,
    latestObservedAt: observedAt || existing?.latestObservedAt || "unknown",
  });
}

function addCurrentQuantity(
  quantities: Map<string, CompareQuantity>,
  row: InventoryCurrentRow,
  fallbackObservedAt: string,
): void {
  const warehouseCode = row.warehouse_code?.trim() ?? "";
  const partNo = row.part_no?.trim() ?? "";
  if (!warehouseCode || !partNo) return;

  const key = compareKey(warehouseCode, partNo);
  const existing = quantities.get(key);
  quantities.set(key, {
    warehouseCode,
    partNo,
    transactionQuantity: existing?.transactionQuantity ?? 0,
    currentQuantity: (existing?.currentQuantity ?? 0) + toQuantity(row.quantity_on_hand),
    latestObservedAt:
      row.updated_at ?? existing?.latestObservedAt ?? fallbackObservedAt,
  });
}

function addTransactionQuantity(
  quantities: Map<string, CompareQuantity>,
  row: InventoryTransactionRow,
  scopedWarehouseCode: string,
  fallbackObservedAt: string,
): void {
  const partNo = row.part_no?.trim() ?? "";
  const quantity = Math.abs(toQuantity(row.quantity));
  const transactionType = row.transaction_type?.trim().toUpperCase() ?? "";
  const observedAt = row.event_at ?? row.created_at ?? fallbackObservedAt;
  if (!partNo || quantity === 0) return;

  if (transactionType === "MOVE") {
    const fromWarehouseCode =
      row.from_warehouse_code?.trim() || row.warehouse_code?.trim() || "";
    const toWarehouseCode = row.to_warehouse_code?.trim() ?? "";
    if (fromWarehouseCode === scopedWarehouseCode) {
      addQuantity(quantities, fromWarehouseCode, partNo, -quantity, observedAt);
    }
    if (toWarehouseCode === scopedWarehouseCode) {
      addQuantity(quantities, toWarehouseCode, partNo, quantity, observedAt);
    }
    return;
  }

  const warehouseCode = row.warehouse_code?.trim() ?? "";
  if (warehouseCode !== scopedWarehouseCode) return;

  if (transactionType === "OUT") {
    addQuantity(quantities, warehouseCode, partNo, -quantity, observedAt);
    return;
  }

  addQuantity(quantities, warehouseCode, partNo, toQuantity(row.quantity), observedAt);
}

function resolveCompareStatus(
  transactionQuantity: number,
  currentQuantity: number,
): InventoryCompareStatus {
  const hasTransactionProjection = transactionQuantity !== 0;
  const hasCurrentProjection = currentQuantity !== 0;

  if (hasTransactionProjection && !hasCurrentProjection) return "missing_projection";
  if (!hasTransactionProjection && hasCurrentProjection) return "orphan_projection";
  if (transactionQuantity === currentQuantity) return "matched";
  return "mismatched";
}

function severityForStatus(status: InventoryCompareStatus): InventoryCompareSeverity {
  if (status === "matched") return "info";
  if (status === "mismatched") return "warning";
  return "critical";
}

function buildCompareProjection(
  row: CompareQuantity,
  generatedAt: string,
): InventoryCompareProjection {
  const differenceQuantity = row.transactionQuantity - row.currentQuantity;
  const compareStatus = resolveCompareStatus(
    row.transactionQuantity,
    row.currentQuantity,
  );
  const projectionId = `real-compare-${row.warehouseCode}-${row.partNo}`;

  return {
    id: projectionId,
    scope: "part",
    label: `${row.warehouseCode} / ${row.partNo}`,
    description:
      "inventory_transactions 集計と inventory_current cache を read-only に比較した visibility です。",
    metadata: {
      identity: {
        projectionId,
        projectionType: "compare_projection",
        projectionVersion: "real-readonly-b76-10",
        scope: "part",
        generatedAt,
        contractVersion: "inventory-integrity-real-compare-readonly-contract",
      },
      snapshot: {
        snapshotId: `${projectionId}-snapshot`,
        asOfTime: row.latestObservedAt,
        observedAt: generatedAt,
        transactionCoverage: "partial",
        freshness: "fresh",
        limitation:
          "read-only select で見える範囲の比較 visibility であり、正しさ保証や更新権限ではありません。",
      },
      evidence: {
        source: {
          source: "inventory_transactions",
          label: "transaction truth aggregate",
          semanticMeaning:
            "inventory_transactions を truth として倉庫・部品単位で集計した数量です。",
        },
        confidence: {
          level: "medium",
          reason:
            "server side の read-only 集計結果を使っていますが、業務確定や正しさ保証ではありません。",
          caveat:
            "confidence は確認材料であり、在庫更新や運用処理の許可ではありません。",
        },
        freshness: {
          level: "fresh",
          reason: "GET 時点で read-only に参照した projection visibility です。",
          caveat: "鮮度は表示上の読み方であり、継続監視や再計算の開始条件ではありません。",
        },
        completeness: {
          level: "partial",
          scope: "認可された warehouse_code の warehouse + part_no compare visibility",
          caveat: "部分的な表示であり、全社在庫の完全性保証ではありません。",
        },
        gaps: [],
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "compare evidence は read-only visibility です。更新、再生成、在庫変更は実行しません。",
      },
      confidence: {
        level: "medium",
        reason: "real read-only compare rows から作成した visibility です。",
        caveat: "説明可能性の目安であり、truth guarantee ではありません。",
      },
      freshness: {
        level: "fresh",
        reason: "GET 時点の read-only result です。",
        caveat: "鮮度は表示上の制限であり、実行権限ではありません。",
      },
      completeness: {
        level: "partial",
        scope: "warehouse + part_no の最小 compare PoC",
        caveat: "location / project / pallet 粒度の完全比較ではありません。",
      },
      traceability: {
        sourceTraceLabel: "inventory_transactions aggregate vs inventory_current cache",
        sourceChain: [
          "inventory_transactions",
          "server-side read-only aggregate",
          "inventory_current",
        ],
        caveat: "source chain は読み方であり、処理チェーンではありません。",
      },
      lineage: {
        lineageLabel: "real read-only compare lineage",
        derivedFrom: ["inventory_transactions aggregate", "inventory_current cache"],
        caveat: "lineage は由来説明であり、在庫の修正権限ではありません。",
      },
      reviewReadiness: {
        level: compareStatus === "matched" ? "review_ready" : "partially_ready",
        reason:
          compareStatus === "matched"
            ? "数量が一致しているため参照確認できます。"
            : "差分が見えるため人が確認する材料として扱います。",
        caveat: "review readiness は実行状態ではなく、確認補助です。",
      },
      lifecycle: {
        state:
          compareStatus === "matched" ? "projection_normalized" : "projection_review_required",
        label: "real read-only compare visibility",
        readability:
          "real data 由来の compare visibility を read-only projection として読む状態です。",
        interpretation:
          "差分の有無は確認材料であり、在庫変更や運用処理を開始しません。",
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "projection lifecycle は表示状態です。更新、再生成、在庫変更は実行しません。",
      },
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "real compare projection は read-only visibility です。更新、再生成、在庫変更は実行しません。",
    },
    difference: {
      currentReadModelQuantity: formatQuantity(row.currentQuantity),
      transactionAggregationQuantity: formatQuantity(row.transactionQuantity),
      differenceQuantity: formatQuantity(differenceQuantity),
      compareStatus,
      reason: compareStatus === "matched" ? "not_compared" : "read_model_cache_gap",
      severity: severityForStatus(compareStatus),
    },
    lineage: {
      trace: {
        traceId: `${projectionId}-trace`,
        parentTraceId: "inventory-integrity-real-compare-readonly",
        label: "real read-only compare trace",
      },
      derivedFrom: [
        {
          source: "inventory_transactions",
          label: "transaction aggregate",
          semanticMeaning: "在庫数量の truth source から read-only に集計した値です。",
        },
        {
          source: "inventory_current",
          label: "current cache",
          semanticMeaning: "比較対象の cache quantity であり truth ではありません。",
        },
      ],
      dependencies: [
        {
          id: `${projectionId}-warehouse-part-key`,
          label: "warehouse_code + part_no",
          semanticMeaning: "最小 compare PoC の集計単位です。",
        },
      ],
      evidence: [
        {
          id: `${projectionId}-readonly-select`,
          label: "read-only select result",
          semanticMeaning: "認可済み GET request 内の参照結果です。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
    },
    truthStatement:
      "inventory_transactions aggregate が truth input で、inventory_current は compare target です。",
  };
}

function buildReadOnlyData(
  fallbackData: InventoryIntegrityReadOnlyData,
  quantities: readonly CompareQuantity[],
  generatedAt: string,
): InventoryIntegrityReadOnlyData {
  const compareProjections = quantities
    .map((quantity) => buildCompareProjection(quantity, generatedAt))
    .sort((a, b) => a.id.localeCompare(b.id));
  const mismatchCount = compareProjections.filter(
    (projection) => projection.difference.compareStatus !== "matched",
  ).length;

  return {
    ...fallbackData,
    summaries: [
      {
        label: "real compare visibility",
        value: `${compareProjections.length} rows`,
        level: mismatchCount > 0 ? "watch" : "stable",
        status: mismatchCount > 0 ? "review_needed" : "compare_ready",
        description:
          "inventory_transactions aggregate と inventory_current cache の read-only compare visibility です。",
      },
      ...fallbackData.summaries,
    ],
    compareProjections,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminDashboardRole(req);
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error },
      { status: guard.status },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "supabase_env_unavailable" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${guard.token}` } },
  });
  const generatedAt = new Date().toISOString();
  const quantities = new Map<string, CompareQuantity>();

  const transactionResult = await supabase
    .from("inventory_transactions")
    .select(
      "transaction_type, part_no, quantity, warehouse_code, from_warehouse_code, to_warehouse_code, event_at, created_at",
    )
    .or(
      `warehouse_code.eq.${guard.warehouseCode},from_warehouse_code.eq.${guard.warehouseCode},to_warehouse_code.eq.${guard.warehouseCode}`,
    )
    .range(0, 9999);

  if (transactionResult.error) {
    return NextResponse.json(
      { ok: false, error: "transaction_read_unavailable" },
      { status: 500 },
    );
  }

  const currentResult = await supabase
    .from("inventory_current")
    .select("part_no, warehouse_code, quantity_on_hand, updated_at")
    .eq("warehouse_code", guard.warehouseCode)
    .range(0, 9999);

  if (currentResult.error) {
    return NextResponse.json(
      { ok: false, error: "current_read_unavailable" },
      { status: 500 },
    );
  }

  ((transactionResult.data ?? []) as InventoryTransactionRow[]).forEach((row) =>
    addTransactionQuantity(quantities, row, guard.warehouseCode, generatedAt),
  );
  ((currentResult.data ?? []) as InventoryCurrentRow[]).forEach((row) =>
    addCurrentQuantity(quantities, row, generatedAt),
  );

  const fallbackData = getInventoryIntegrityMockData();
  const readOnlyData = buildReadOnlyData(
    fallbackData,
    Array.from(quantities.values()),
    generatedAt,
  );
  const endpointContract = createInventoryIntegrityReadOnlyEndpointContract(endpointPath);
  const request = createInventoryIntegrityReadOnlyEdgeRequest(endpointContract);
  const fetchResult = createInventoryIntegrityFetchResult(
    realReadOnlyProjectionSourceMetadata,
    readOnlyData,
    request,
    "future_edge_fetch_result",
  );
  const payload = adaptFetchResponseToPayload(fetchResult);
  const mappedResponse = mapEdgeProjectionResponse({
    payload,
    semanticBoundary: payload.semanticBoundary,
    executionBoundary: payload.executionBoundary,
  });

  return NextResponse.json({
    ok: true,
    endpoint: endpointPath,
    method: "GET",
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    warehouseCode: guard.warehouseCode,
    normalizedData: mappedResponse.normalizedData,
    metadata: mappedResponse.metadata,
    statusSemantics: mappedResponse.statusSemantics,
    semanticBoundary: mappedResponse.semanticBoundary,
    executionBoundary: mappedResponse.executionBoundary,
  });
}
