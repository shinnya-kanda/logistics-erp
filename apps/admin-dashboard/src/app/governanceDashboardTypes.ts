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
  | "attention"
  | "provenance"
  | "explainability";

export type GovernanceTimelineSeverity = "info" | "watch" | "attention" | "critical";

export type GovernanceTimelineVisibility = "overview" | "grouped" | "highlighted" | "detail";

export type GovernanceTimelineRelation =
  | "source_event"
  | "derived_signal"
  | "evidence_link"
  | "semantic_context"
  | "attention_marker";

export type GovernanceTimelineEvidenceState =
  | "none"
  | "referenced"
  | "partial"
  | "lineage_visible";

export type GovernanceEvidenceCategory =
  | "rationale"
  | "provenance"
  | "lineage"
  | "confidence"
  | "audit_context";

export type GovernanceEvidenceConfidence = "high" | "medium" | "low" | "unknown";

export type GovernanceEvidenceVisibility = "summary" | "reasoning" | "lineage" | "detail";

export type GovernanceEvidenceRelation =
  | "supports_reasoning"
  | "explains_signal"
  | "links_lineage"
  | "qualifies_confidence"
  | "marks_limitation";

export type GovernanceEvidenceSource =
  | "static_mock"
  | "policy_reference"
  | "timeline_projection"
  | "semantic_review";

export type GovernanceBadgeCategory =
  | "severity"
  | "lifecycle"
  | "approval"
  | "evidence"
  | "freshness"
  | "degradation"
  | "visibility"
  | "read_only"
  | "review_signal";

export type GovernanceBadgeTone = "neutral" | "info" | "warning" | "high" | "critical" | "safe";

export type GovernanceBadgeVisibility =
  | "overview"
  | "summary"
  | "detail"
  | "state_notice"
  | "timeline"
  | "note";

export type GovernanceSemanticBadge = {
  readonly id: string;
  readonly category: GovernanceBadgeCategory;
  readonly label: string;
  readonly tone: GovernanceBadgeTone;
  readonly visibility: GovernanceBadgeVisibility;
  readonly semanticMeaning: string;
};

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

export type GovernanceRenderState = "readonly" | "ready" | "partial" | "stale" | "degraded";

export type GovernanceFreshnessState = "fresh" | "stale" | "unknown";

export type GovernanceDegradationState = "none" | "limited" | "degraded";

export type GovernanceVisibilityMode = "overview" | "summary" | "detail" | "timeline";

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

export type GovernanceTimelineProjection = GovernanceContractMetadata & {
  readonly id: string;
  readonly occurredAtLabel: string;
  readonly category: GovernanceTimelineCategory;
  readonly categoryLabel: string;
  readonly title: string;
  readonly description: string;
  readonly sourceLabel: string;
  readonly projectionLabel: string;
  readonly timelineSeverity: GovernanceTimelineSeverity;
  readonly timelineVisibility: GovernanceTimelineVisibility;
  readonly relation: GovernanceTimelineRelation;
  readonly evidenceState: GovernanceTimelineEvidenceState;
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly highlight: boolean;
  readonly attention: boolean;
};

export type GovernanceTimelineItem = GovernanceTimelineProjection;

export type GovernanceIncidentSummaryRow = GovernanceSummaryRow;

export type GovernanceOperationQueueSummaryRow = GovernanceSummaryRow;

export type GovernanceEvidenceProjection = GovernanceSummaryRow & {
  readonly evidenceCategory: GovernanceEvidenceCategory;
  readonly confidence: GovernanceEvidenceConfidence;
  readonly evidenceVisibility: GovernanceEvidenceVisibility;
  readonly relation: GovernanceEvidenceRelation;
  readonly source: GovernanceEvidenceSource;
  readonly projectionLabel: string;
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly attention: boolean;
};

export type GovernanceEvidenceSummaryRow = GovernanceEvidenceProjection;

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
  readonly renderingState: GovernanceRenderingState;
  readonly overviewCards: readonly GovernanceOverviewCard[];
  readonly incidentSummary: readonly GovernanceIncidentSummaryRow[];
  readonly operationQueueSummary: readonly GovernanceOperationQueueSummaryRow[];
  readonly evidenceSummary: readonly GovernanceEvidenceSummaryRow[];
  readonly readOnlyNotes: readonly GovernanceReadOnlyNote[];
  readonly timelineItems: readonly GovernanceTimelineProjection[];
};

export type GovernanceStateNotice = {
  readonly displayState: GovernanceDisplayState;
  readonly renderState: GovernanceRenderState;
  readonly freshnessState: GovernanceFreshnessState;
  readonly degradationState: GovernanceDegradationState;
  readonly visibilityMode: GovernanceVisibilityMode;
  readonly semanticBadges: readonly GovernanceSemanticBadge[];
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

export type GovernanceTimelineDisplayItem = GovernanceTimelineProjection;

export type GovernanceTimelineGroup = {
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly items: readonly GovernanceTimelineProjection[];
};

export type GovernanceEvidenceGroup = {
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly items: readonly GovernanceEvidenceProjection[];
};

export type GovernanceEvidenceConfidenceSummary = {
  readonly confidence: GovernanceEvidenceConfidence;
  readonly count: number;
};

export type GovernanceRenderingState = {
  readonly renderState: GovernanceRenderState;
  readonly freshnessState: GovernanceFreshnessState;
  readonly degradationState: GovernanceDegradationState;
  readonly visibilityMode: GovernanceVisibilityMode;
  readonly label: string;
  readonly message: string;
};

export type GovernanceSummaryCardMock = GovernanceOverviewCard;

export type GovernanceIncidentMock = GovernanceIncidentSummaryRow;

export type GovernanceOperationQueueMock = GovernanceOperationQueueSummaryRow;

export type GovernanceEvidenceMock = GovernanceEvidenceSummaryRow;

export type GovernanceTimelineMock = GovernanceTimelineProjection;

export type GovernanceReadOnlyNoteMock = GovernanceReadOnlyNote;

export type GovernanceDashboardMockContract = {
  readonly renderingState: GovernanceRenderingState;
  readonly overviewCards: readonly GovernanceSummaryCardMock[];
  readonly incidentSummary: readonly GovernanceIncidentMock[];
  readonly operationQueueSummary: readonly GovernanceOperationQueueMock[];
  readonly evidenceSummary: readonly GovernanceEvidenceMock[];
  readonly readOnlyNotes: readonly GovernanceReadOnlyNoteMock[];
  readonly timelineItems: readonly GovernanceTimelineMock[];
};
