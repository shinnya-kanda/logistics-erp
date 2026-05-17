import type {
  InventoryCompareProjection,
  InventoryIntegritySelectorNormalizationBoundary,
  InventoryProjectionMetadataView,
  InventoryProjectionReviewReadinessView,
  InventoryProjectionSummaryView,
} from "./inventoryIntegrityTypes";

// Pure selector normalization boundary for normalized projection -> selector view model.
// Selectors are read-only view shaping only; they must not fetch, execute, orchestrate, or mutate.

const selectorNormalizationBoundary: InventoryIntegritySelectorNormalizationBoundary = {
  selectorId: "inventory-integrity-selector-normalization-boundary",
  label: "selector 正規化境界",
  semanticMeaning:
    "normalized projection を UI が読む view model へ整理する read-only selector boundary です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "selector は UI business execution ではありません。fetch、Supabase 接続、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
};

export function selectProjectionSummary(
  projection: InventoryCompareProjection,
): InventoryProjectionSummaryView {
  return {
    projectionId: projection.id,
    label: projection.label,
    scope: projection.scope,
    description: projection.description,
    difference: projection.difference,
    truthStatement: projection.truthStatement,
    selectorBoundary: selectorNormalizationBoundary,
  };
}

export function selectProjectionMetadata(
  projection: InventoryCompareProjection,
): InventoryProjectionMetadataView {
  return {
    projectionId: projection.id,
    metadata: projection.metadata,
    selectorBoundary: selectorNormalizationBoundary,
  };
}

export function selectProjectionReviewReadiness(
  projection: InventoryCompareProjection,
): InventoryProjectionReviewReadinessView {
  return {
    projectionId: projection.id,
    reviewReadiness: projection.metadata.reviewReadiness,
    freshness: projection.metadata.freshness,
    completeness: projection.metadata.completeness,
    confidence: projection.metadata.confidence,
    selectorBoundary: selectorNormalizationBoundary,
  };
}
