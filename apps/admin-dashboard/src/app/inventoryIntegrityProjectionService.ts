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
  InventoryIntegrityProjectionServiceBoundary,
  InventoryIntegrityProjectionServiceView,
  InventoryIntegrityReadOnlySource,
  InventoryIntegrityReviewProjectionView,
  InventoryIntegritySummaryProjectionView,
  ProjectionResolutionTarget,
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

export function getInventoryIntegrityProjection(
  source: InventoryIntegrityReadOnlySource,
  target: ProjectionResolutionTarget = defaultInventoryIntegrityProjectionTarget,
): InventoryIntegrityProjectionServiceView {
  const resolution = resolveInventoryIntegrityProjection(source, target);
  const data = (resolution?.source ?? source).read();

  return {
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
  target: ProjectionResolutionTarget = defaultInventoryIntegrityProjectionTarget,
): InventoryIntegritySummaryProjectionView {
  const projection = getInventoryIntegrityProjection(source, target);

  return {
    summaries: projection.data.summaries,
    issues: projection.data.issues,
    signals: projection.data.signals,
    projectionSummaries: projection.projectionSummaries,
    serviceBoundary: projection.serviceBoundary,
  };
}

export function getInventoryIntegrityReviewProjection(
  source: InventoryIntegrityReadOnlySource,
  target: ProjectionResolutionTarget = defaultInventoryIntegrityProjectionTarget,
): InventoryIntegrityReviewProjectionView {
  const projection = getInventoryIntegrityProjection(source, target);

  return {
    attentionProjections: projection.data.attentionProjections,
    projectionReviewReadiness: projection.projectionReviewReadiness,
    serviceBoundary: projection.serviceBoundary,
  };
}
