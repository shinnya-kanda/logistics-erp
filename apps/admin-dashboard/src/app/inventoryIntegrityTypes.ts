// Static read-only contract for inventory integrity visualization.
// This scaffold models compare / lineage / attention / evidence semantics only.
// It must not grow rebuild, replay, correction, or inventory mutation contracts.

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

export type InventoryIntegrityAttentionLevel =
  | "audit_required"
  | "tracking_required"
  | "review_required"
  | "reference";

export type InventoryIntegrityReviewPriority = "high" | "medium" | "low";

export type InventoryIntegrityEscalation = {
  readonly candidate: "audit_review_candidate" | "manager_review_candidate" | "none";
  readonly label: string;
  readonly semanticMeaning: string;
  readonly executionBoundary: string;
};

export type InventoryIntegrityReviewSignal = {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly evidenceHint: string;
};

export type InventoryIntegrityAttention = {
  readonly id: string;
  readonly projectionId: string;
  readonly attentionLevel: InventoryIntegrityAttentionLevel;
  readonly reviewPriority: InventoryIntegrityReviewPriority;
  readonly title: string;
  readonly reason: string;
  readonly reviewFocus: string;
  readonly escalation: InventoryIntegrityEscalation;
  readonly reviewSignals: readonly InventoryIntegrityReviewSignal[];
  readonly semanticBoundary: "reasoning_visualization_only";
  readonly executionBoundary: string;
};

export type InventoryIntegrityEvidenceSource = {
  readonly source:
    | "inventory_transactions"
    | "inventory_current"
    | "lineage_projection"
    | "attention_projection"
    | "static_policy";
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryIntegrityEvidenceConfidence = "high" | "medium" | "low" | "unknown";

export type InventoryIntegrityEvidenceQuality =
  | "sufficient"
  | "partial"
  | "limited"
  | "missing";

export type InventoryIntegrityEvidenceGap = {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly limitation: string;
};

export type InventoryIntegrityEvidence = {
  readonly id: string;
  readonly projectionId: string;
  readonly attentionId: string;
  readonly title: string;
  readonly source: InventoryIntegrityEvidenceSource;
  readonly confidence: InventoryIntegrityEvidenceConfidence;
  readonly quality: InventoryIntegrityEvidenceQuality;
  readonly explanation: string;
  readonly rationale: string;
  readonly gaps: readonly InventoryIntegrityEvidenceGap[];
  readonly semanticBoundary: "reasoning_visualization_only";
  readonly executionBoundary: string;
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
  readonly attentionProjections: readonly InventoryIntegrityAttention[];
  readonly evidenceProjections: readonly InventoryIntegrityEvidence[];
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

export type InventoryIntegrityAttentionLevelSummary = {
  readonly attentionLevel: InventoryIntegrityAttentionLevel;
  readonly count: number;
};

export type InventoryIntegrityReviewPrioritySummary = {
  readonly reviewPriority: InventoryIntegrityReviewPriority;
  readonly count: number;
};

export type InventoryIntegrityEscalationSummary = {
  readonly candidate: InventoryIntegrityEscalation["candidate"];
  readonly count: number;
};

export type InventoryIntegrityReviewSignalGraphItem = {
  readonly attentionId: string;
  readonly projectionId: string;
  readonly reviewSignal: InventoryIntegrityReviewSignal;
};

export type InventoryIntegrityEvidenceQualitySummary = {
  readonly quality: InventoryIntegrityEvidenceQuality;
  readonly count: number;
};

export type InventoryIntegrityEvidenceConfidenceSummary = {
  readonly confidence: InventoryIntegrityEvidenceConfidence;
  readonly count: number;
};

export type InventoryIntegrityEvidenceGapGraphItem = {
  readonly evidenceId: string;
  readonly projectionId: string;
  readonly gap: InventoryIntegrityEvidenceGap;
};
