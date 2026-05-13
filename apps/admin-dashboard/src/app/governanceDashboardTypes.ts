// Read-only data contract for the static Governance Dashboard.
// This file intentionally defines display-only records. It must not grow
// write-side workflow contracts.

export type GovernanceSeverity = "info" | "warning" | "high" | "critical";

export type GovernanceLifecycleState =
  | "detected"
  | "reviewing"
  | "classified"
  | "reaffirmed";

export type GovernanceDegradationType =
  | "none"
  | "meaning_consistency"
  | "semantic_safety"
  | "safe_interpretation"
  | "integrity"
  | "attention"
  | "readability"
  | "lifecycle";

export type GovernanceNoteType =
  | "semantic_safety"
  | "integrity"
  | "attention"
  | "safe_interpretation";

export type GovernanceSemanticNoteCategory =
  | "interpretation_safety"
  | "governance_quality"
  | "review_signal_only"
  | "expectation_isolation";

export type GovernanceTimelineCategory =
  | "incident"
  | "semantic_review"
  | "evidence"
  | "integrity"
  | "attention";

export type GovernanceSemanticBadge = "approval" | "evidence" | "read_only" | "review_signal";

export type GovernanceNoteVisibility = "overview" | "summary" | "detail" | "note";

export type GovernanceReadabilityLevel =
  | "scan_first"
  | "short_note"
  | "detail_note";

export type GovernanceOverviewTone = GovernanceSeverity | "safe";

export type GovernanceDisplayState =
  | "loading"
  | "ready"
  | "empty"
  | "stale"
  | "partial"
  | "degraded";

export type GovernanceContractMetadata = {
  readonly severity: GovernanceSeverity;
  readonly lifecycleState: GovernanceLifecycleState;
  readonly degradationType: GovernanceDegradationType;
  readonly visibility: GovernanceNoteVisibility;
  readonly readability: GovernanceReadabilityLevel;
};

export type GovernanceOverviewCard = GovernanceContractMetadata & {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly tone: GovernanceOverviewTone;
  readonly semanticBadges?: readonly GovernanceSemanticBadge[];
};

export type GovernanceSummaryRow = GovernanceContractMetadata & {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly semanticBadges?: readonly GovernanceSemanticBadge[];
};

export type GovernanceTimelineItem = GovernanceContractMetadata & {
  readonly id: string;
  readonly occurredAtLabel: string;
  readonly category: GovernanceTimelineCategory;
  readonly categoryLabel: string;
  readonly title: string;
  readonly description: string;
  readonly sourceLabel: string;
};

export type GovernanceIncidentSummaryRow = GovernanceSummaryRow;

export type GovernanceOperationQueueSummaryRow = GovernanceSummaryRow;

export type GovernanceEvidenceSummaryRow = GovernanceSummaryRow;

export type GovernanceReadOnlyNoteBase = GovernanceContractMetadata & {
  readonly noteType: GovernanceNoteType;
  readonly title: string;
  readonly category: GovernanceSemanticNoteCategory;
  readonly categoryLabel: string;
  readonly note: string;
};

export type GovernanceSemanticNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "semantic_safety";
};

export type GovernanceIntegrityNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "integrity";
};

export type GovernanceAttentionNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "attention";
};

export type GovernanceSafeInterpretationNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "safe_interpretation";
};

export type GovernanceReadOnlyNote =
  | GovernanceSemanticNote
  | GovernanceIntegrityNote
  | GovernanceAttentionNote
  | GovernanceSafeInterpretationNote;

export type GovernanceDashboardReadOnlyData = {
  readonly overviewCards: readonly GovernanceOverviewCard[];
  readonly incidentSummary: readonly GovernanceIncidentSummaryRow[];
  readonly operationQueueSummary: readonly GovernanceOperationQueueSummaryRow[];
  readonly evidenceSummary: readonly GovernanceEvidenceSummaryRow[];
  readonly readOnlyNotes: readonly GovernanceReadOnlyNote[];
  readonly timelineItems: readonly GovernanceTimelineItem[];
};

export type GovernanceStateNotice = {
  readonly displayState: GovernanceDisplayState;
  readonly title: string;
  readonly message: string;
  readonly severity: GovernanceSeverity;
  readonly lifecycleState: GovernanceLifecycleState;
  readonly visibility: GovernanceNoteVisibility;
  readonly readability: GovernanceReadabilityLevel;
};

export type GovernanceOverviewItem = GovernanceOverviewCard;

export type GovernanceIncidentSummaryItem = GovernanceIncidentSummaryRow;

export type GovernanceOperationQueueItem = GovernanceOperationQueueSummaryRow;

export type GovernanceEvidenceSummaryItem = GovernanceEvidenceSummaryRow;

export type GovernanceSemanticNoteItem = GovernanceReadOnlyNote;

export type GovernanceTimelineDisplayItem = GovernanceTimelineItem;
