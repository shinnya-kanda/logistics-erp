// Static read-only contract for inventory integrity visualization.
// This scaffold intentionally models compare semantics only. It must not grow
// rebuild, replay, correction, or inventory mutation contracts.

export type InventoryIntegrityLevel = "stable" | "watch" | "limited" | "degraded";

export type InventoryIntegrityStatus =
  | "compare_ready"
  | "review_needed"
  | "source_gap"
  | "projection_gap";

export type InventoryIntegrityIssue = {
  readonly id: string;
  readonly level: InventoryIntegrityLevel;
  readonly status: InventoryIntegrityStatus;
  readonly title: string;
  readonly description: string;
  readonly currentReadModelSignal: string;
  readonly transactionTruthSignal: string;
};

export type InventoryIntegritySignal = {
  readonly id: string;
  readonly level: InventoryIntegrityLevel;
  readonly label: string;
  readonly value: string;
  readonly note: string;
};

export type InventoryIntegritySummary = {
  readonly label: string;
  readonly value: string;
  readonly level: InventoryIntegrityLevel;
  readonly status: InventoryIntegrityStatus;
  readonly description: string;
};

export type InventoryCompareSeverity = "info" | "watch" | "warning" | "critical";

export type InventoryCompareReason =
  | "read_model_cache_gap"
  | "transaction_aggregation_gap"
  | "location_scope_gap"
  | "project_scope_gap"
  | "not_compared";

export type InventoryCompareScope =
  | "part"
  | "location"
  | "project"
  | "inventory_type"
  | "warehouse";

export type InventoryCompareDifference = {
  readonly currentReadModelQuantity: string;
  readonly transactionAggregationQuantity: string;
  readonly differenceQuantity: string;
  readonly reason: InventoryCompareReason;
  readonly severity: InventoryCompareSeverity;
};

export type InventoryCompareProjection = {
  readonly id: string;
  readonly scope: InventoryCompareScope;
  readonly label: string;
  readonly description: string;
  readonly difference: InventoryCompareDifference;
  readonly truthStatement: string;
  readonly executionBoundary: string;
};

export type InventoryIntegrityReadOnlyData = {
  readonly summaries: readonly InventoryIntegritySummary[];
  readonly issues: readonly InventoryIntegrityIssue[];
  readonly signals: readonly InventoryIntegritySignal[];
  readonly compareProjections: readonly InventoryCompareProjection[];
};

export type InventoryIntegrityLevelSummary = {
  readonly level: InventoryIntegrityLevel;
  readonly count: number;
};

export type InventoryIntegrityStatusSummary = {
  readonly status: InventoryIntegrityStatus;
  readonly count: number;
};

export type InventoryCompareSeveritySummary = {
  readonly severity: InventoryCompareSeverity;
  readonly count: number;
};

export type InventoryCompareReasonSummary = {
  readonly reason: InventoryCompareReason;
  readonly count: number;
};

export type InventoryCompareScopeSummary = {
  readonly scope: InventoryCompareScope;
  readonly count: number;
};
