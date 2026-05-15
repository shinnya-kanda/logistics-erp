import type {
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
