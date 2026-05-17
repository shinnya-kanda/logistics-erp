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
  InventoryIntegrityProjectionQuery,
  InventoryIntegrityProjectionServiceBoundary,
  InventoryIntegrityProjectionServiceView,
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
  semanticMeaning:
    "Inventory Integrity の static read-only projection service input boundary を示す query contract です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "query contract は query engine ではありません。fetch、Supabase 接続、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
};

export function getInventoryIntegrityProjection(
  source: InventoryIntegrityReadOnlySource,
  query: InventoryIntegrityProjectionQuery = defaultInventoryIntegrityProjectionQuery,
): InventoryIntegrityProjectionServiceView {
  const resolution = resolveInventoryIntegrityProjection(source, query.target);
  const data = (resolution?.source ?? source).read();

  return {
    query,
    data,
    resolution,
    projectionSummaries: data.compareProjections.map(selectProjectionSummary),
    projectionMetadata: data.compareProjections.map(selectProjectionMetadata),
    projectionReviewReadiness: data.compareProjections.map(selectProjectionReviewReadiness),
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
