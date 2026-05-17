import {
  defaultInventoryIntegrityProjectionTarget,
  resolveInventoryIntegrityProjection,
} from "./inventoryIntegrityProjectionResolver";
import {
  selectProjectionMetadata,
  selectProjectionReviewReadiness,
  selectProjectionSummary,
} from "./inventoryIntegritySelectorNormalization";
import type {
  InventoryIntegrityEdgeProjectionResponse,
  InventoryIntegrityProjectionQuery,
  InventoryIntegrityProjectionServiceBoundary,
  InventoryIntegrityProjectionServiceView,
  InventoryIntegrityReadOnlyData,
  InventoryIntegrityReadOnlySource,
  InventoryIntegrityReviewProjectionView,
  InventoryIntegritySummaryProjectionView,
} from "./inventoryIntegrityTypes";

// Read-only projection service scaffold for resolver + selector normalization composition.
// This is a composition boundary only: no fetch, execution orchestration, mutation, or workflow.

const projectionServiceBoundary: InventoryIntegrityProjectionServiceBoundary = {
  serviceId: "inventory-integrity-read-only-projection-service",
  label: "read-only projection service 境界",
  semanticMeaning:
    "resolver と selector normalization を束ね、static read-only projection を表示用に読む composition boundary です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "projection service は execution orchestration ではありません。fetch、Supabase 接続、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
};

export const defaultInventoryIntegrityProjectionQuery: InventoryIntegrityProjectionQuery = {
  queryId: "inventory-integrity-static-read-only-query",
  target: defaultInventoryIntegrityProjectionTarget,
  scope: {
    scope: "all",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "projection scope は read-only 表示範囲の指定であり、DB query、fetch、実データ絞り込み、mutation は実行しません。",
  },
  viewMode: "integrity_view",
  reviewMode: "read_only_review",
  context: {
    contextId: "inventory-integrity-static-read-only-context",
    label: "静的 read-only 解釈 context",
    semanticMeaning:
      "Inventory Integrity projection を governance / review / warehouse の観点で読むための read-only interpretation context です。",
    governance: {
      governanceMode: "read_only_governance",
      interpretationFocus:
        "差異、根拠、由来、レビュー可能性を参照表示として読むための governance context です。",
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "governance context は approval、workflow、rebuild、correction、mutation の実行権限ではありません。",
    },
    review: {
      reviewMode: "read_only_review",
      reviewFocus:
        "review-readiness と limitation を参照し、実行判断ではなく確認観点として読む context です。",
      reviewReadiness: "partially_ready",
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "review context は auto-review、担当割当、通知、承認、修正、workflow 開始を実行しません。",
    },
    warehouse: {
      warehouseScope: "all_warehouses",
      warehouseLabel: "全倉庫 static context",
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "warehouse context は runtime auth context ではなく、倉庫切替、DB 絞り込み、live data 接続、mutation を実行しません。",
    },
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "projection context は read-only interpretation boundary であり、fetch、Supabase 接続、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
  },
  semanticMeaning:
    "Inventory Integrity の static read-only projection service input boundary を示す query contract です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "query contract は query engine ではありません。fetch、Supabase 接続、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
};

function createStaticReadOnlyProjectionResponse(
  source: InventoryIntegrityReadOnlySource,
  data: InventoryIntegrityReadOnlyData,
): InventoryIntegrityEdgeProjectionResponse {
  return {
    metadata: {
      responseId: "inventory-integrity-static-read-only-response",
      responseKind: "static_read_only_response",
      source: source.metadata,
      responseContractVersion: "inventory-integrity-edge-projection-response-v1",
      readability:
        "static read-only data を future Edge response と同じ normalized response boundary として読むための metadata です。",
      adapterInputBoundary:
        "adapter input boundary の意味整理のみです。Edge API implementation、fetch、network access、Supabase 接続は含みません。",
      truthSource: "inventory_transactions",
      cacheCompareTarget: "inventory_current",
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "response metadata は future edge response boundary であり、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
    },
    lifecycle: {
      state: "projection_normalized",
      label: "正規化済み static response",
      readability:
        "static mock source 由来の normalized response として読めますが、live response や実データ取得完了ではありません。",
      interpretation:
        "normalized response は表示用 contract の成立を示すだけで、正しさ保証、Edge 呼び出し完了、実行許可を意味しません。",
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "response lifecycle は lifecycle engine ではありません。fetch、network access、compare execution、rebuild、mutation は実行しません。",
    },
    normalizedData: data,
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryIntegrityEdgeProjectionResponse は read-only response contract です。Edge Function 呼び出し、network access、mutation は実行しません。",
  };
}

export function getInventoryIntegrityProjection(
  source: InventoryIntegrityReadOnlySource,
  query: InventoryIntegrityProjectionQuery = defaultInventoryIntegrityProjectionQuery,
): InventoryIntegrityProjectionServiceView {
  const resolution = resolveInventoryIntegrityProjection(source, query.target);
  const data = (resolution?.source ?? source).read();
  const response = createStaticReadOnlyProjectionResponse(resolution?.source ?? source, data);

  return {
    query,
    response,
    data: response.normalizedData,
    resolution,
    projectionSummaries: response.normalizedData.compareProjections.map(selectProjectionSummary),
    projectionMetadata: response.normalizedData.compareProjections.map(selectProjectionMetadata),
    projectionReviewReadiness:
      response.normalizedData.compareProjections.map(selectProjectionReviewReadiness),
    serviceBoundary: projectionServiceBoundary,
  };
}

export function getInventoryIntegritySummaryProjection(
  source: InventoryIntegrityReadOnlySource,
  query: InventoryIntegrityProjectionQuery = defaultInventoryIntegrityProjectionQuery,
): InventoryIntegritySummaryProjectionView {
  const projection = getInventoryIntegrityProjection(source, query);

  return {
    query: projection.query,
    summaries: projection.data.summaries,
    issues: projection.data.issues,
    signals: projection.data.signals,
    projectionSummaries: projection.projectionSummaries,
    serviceBoundary: projection.serviceBoundary,
  };
}

export function getInventoryIntegrityReviewProjection(
  source: InventoryIntegrityReadOnlySource,
  query: InventoryIntegrityProjectionQuery = defaultInventoryIntegrityProjectionQuery,
): InventoryIntegrityReviewProjectionView {
  const projection = getInventoryIntegrityProjection(source, query);

  return {
    query: projection.query,
    attentionProjections: projection.data.attentionProjections,
    projectionReviewReadiness: projection.projectionReviewReadiness,
    serviceBoundary: projection.serviceBoundary,
  };
}
