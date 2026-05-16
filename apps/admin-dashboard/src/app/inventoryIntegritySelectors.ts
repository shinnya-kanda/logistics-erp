import type {
  InventoryCompareProjection,
  InventoryCompareReason,
  InventoryCompareReasonSummary,
  InventoryCompareScope,
  InventoryCompareScopeSummary,
  InventoryCompareSeverity,
  InventoryCompareSeveritySummary,
  InventoryIntegrityIssue,
  InventoryIntegrityLevel,
  InventoryIntegrityLevelSummary,
  InventoryIntegrityReadOnlyData,
  InventoryIntegritySignal,
  InventoryIntegrityStatus,
  InventoryIntegrityStatusSummary,
  InventoryIntegritySummary,
} from "./inventoryIntegrityTypes";

export function getInventoryIntegritySummaries(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySummary[] {
  return data.summaries;
}

export function getInventoryIntegrityIssues(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityIssue[] {
  return data.issues;
}

export function getInventoryIntegritySignals(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySignal[] {
  return data.signals;
}

export function getInventoryCompareProjections(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareProjection[] {
  return data.compareProjections;
}

export function getInventoryIntegrityLevelSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityLevelSummary[] {
  const levelOrder: readonly InventoryIntegrityLevel[] = [
    "degraded",
    "limited",
    "watch",
    "stable",
  ];
  const allItems = [...data.summaries, ...data.issues, ...data.signals];

  return levelOrder
    .map((level) => ({
      level,
      count: allItems.filter((item) => item.level === level).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityStatusSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityStatusSummary[] {
  const statusOrder: readonly InventoryIntegrityStatus[] = [
    "review_needed",
    "projection_gap",
    "source_gap",
    "compare_ready",
  ];
  const statusItems = [...data.summaries, ...data.issues];

  return statusOrder
    .map((status) => ({
      status,
      count: statusItems.filter((item) => item.status === status).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryCompareSeveritySummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareSeveritySummary[] {
  const severityOrder: readonly InventoryCompareSeverity[] = [
    "critical",
    "warning",
    "watch",
    "info",
  ];

  return severityOrder
    .map((severity) => ({
      severity,
      count: data.compareProjections.filter(
        (projection) => projection.difference.severity === severity,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryCompareReasonSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareReasonSummary[] {
  const reasonOrder: readonly InventoryCompareReason[] = [
    "read_model_cache_gap",
    "transaction_aggregation_gap",
    "location_scope_gap",
    "project_scope_gap",
    "not_compared",
  ];

  return reasonOrder
    .map((reason) => ({
      reason,
      count: data.compareProjections.filter(
        (projection) => projection.difference.reason === reason,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryCompareScopeSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareScopeSummary[] {
  const scopeOrder: readonly InventoryCompareScope[] = [
    "warehouse",
    "project",
    "location",
    "part",
    "inventory_type",
  ];

  return scopeOrder
    .map((scope) => ({
      scope,
      count: data.compareProjections.filter((projection) => projection.scope === scope).length,
    }))
    .filter((summary) => summary.count > 0);
}
