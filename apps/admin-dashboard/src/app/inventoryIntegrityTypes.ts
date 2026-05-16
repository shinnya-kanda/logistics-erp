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

export type InventoryCompareTrace = {
  readonly traceId: string;
  readonly parentTraceId: string;
  readonly label: string;
};

export type InventoryCompareDerivedFrom = {
  readonly source: "inventory_transactions" | "inventory_current" | "static_policy";
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryCompareDependency = {
  readonly id: string;
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryCompareEvidence = {
  readonly id: string;
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryCompareLineage = {
  readonly trace: InventoryCompareTrace;
  readonly derivedFrom: readonly InventoryCompareDerivedFrom[];
  readonly dependencies: readonly InventoryCompareDependency[];
  readonly evidence: readonly InventoryCompareEvidence[];
  readonly semanticBoundary: "reasoning_visualization_only";
};

export type InventoryCompareProjection = {
  readonly id: string;
  readonly scope: InventoryCompareScope;
  readonly label: string;
  readonly description: string;
  readonly difference: InventoryCompareDifference;
  readonly lineage: InventoryCompareLineage;
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

export type InventoryCompareLineageGraphItem = {
  readonly projectionId: string;
  readonly trace: InventoryCompareTrace;
  readonly derivedFrom: readonly InventoryCompareDerivedFrom[];
};

export type InventoryCompareDependencyGraphItem = {
  readonly projectionId: string;
  readonly dependency: InventoryCompareDependency;
};

export type InventoryCompareEvidenceGraphItem = {
  readonly projectionId: string;
  readonly evidence: InventoryCompareEvidence;
};
